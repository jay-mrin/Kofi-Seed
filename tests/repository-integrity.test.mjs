import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepositoryFile(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

test("every Edge Function is deployed and has explicit JWT configuration", () => {
  const functionsRoot = path.join(repositoryRoot, "supabase/functions");
  const functionNames = readdirSync(functionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && existsSync(path.join(functionsRoot, entry.name, "index.ts")))
    .map((entry) => entry.name);
  const packageJson = JSON.parse(readRepositoryFile("package.json"));
  const deployCommand = packageJson.scripts?.["supabase:deploy"] || "";
  const deployPrefix = "supabase functions deploy ";

  assert.ok(deployCommand.startsWith(deployPrefix), "supabase:deploy must use `supabase functions deploy`");

  const deployedFunctions = deployCommand.slice(deployPrefix.length).trim().split(/\s+/).filter(Boolean);
  const configuredFunctions = [...readRepositoryFile("supabase/config.toml").matchAll(/^\[functions\.([^\]]+)\]$/gm)]
    .map((match) => match[1]);

  assert.deepEqual(sorted(deployedFunctions), sorted(functionNames), "supabase:deploy must include every function directory exactly once");
  assert.deepEqual(sorted(configuredFunctions), sorted(functionNames), "supabase/config.toml must configure every function explicitly");
  assert.equal(new Set(deployedFunctions).size, deployedFunctions.length, "supabase:deploy must not contain duplicates");
  assert.equal(new Set(configuredFunctions).size, configuredFunctions.length, "Supabase function config must not contain duplicates");
});

test("HTML files have unique IDs and valid local file references", () => {
  const htmlFiles = readdirSync(repositoryRoot).filter((name) => name.endsWith(".html"));

  for (const htmlFile of htmlFiles) {
    const html = readRepositoryFile(htmlFile);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

    assert.deepEqual([...new Set(duplicateIds)], [], `${htmlFile} contains duplicate IDs`);

    for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
      const reference = match[1];
      if (/^(?:#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) continue;

      const cleanReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
      if (!cleanReference) continue;

      assert.ok(
        existsSync(path.resolve(repositoryRoot, path.dirname(htmlFile), cleanReference)),
        `${htmlFile} references missing local file ${cleanReference}`,
      );
    }

    const idSet = new Set(ids);
    for (const match of html.matchAll(/\b(?:aria-controls|aria-describedby|aria-labelledby)="([^"]+)"/g)) {
      for (const referencedId of match[1].trim().split(/\s+/)) {
        assert.ok(idSet.has(referencedId), `${htmlFile} references missing ARIA target #${referencedId}`);
      }
    }
  }
});

test("frontend ID selectors and static asset paths resolve", () => {
  const html = readRepositoryFile("index.html");
  const app = readRepositoryFile("src/app.js");
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const selectedIds = [...app.matchAll(/querySelector\("#([A-Za-z0-9_-]+)"\)/g)].map((match) => match[1]);

  for (const selectedId of selectedIds) {
    assert.ok(htmlIds.has(selectedId), `src/app.js selects missing element #${selectedId}`);
  }

  const frontendSource = `${html}\n${app}`;
  const assetPaths = [...frontendSource.matchAll(/["'](assets\/[A-Za-z0-9._/-]+)(?:\?[^"']*)?["']/g)]
    .map((match) => match[1]);

  for (const assetPath of assetPaths) {
    assert.ok(existsSync(path.join(repositoryRoot, assetPath)), `frontend references missing asset ${assetPath}`);
  }
});

test("the header does not show a seed-count badge", () => {
  const html = readRepositoryFile("index.html");
  const styles = readRepositoryFile("src/styles.css");

  assert.doesNotMatch(html, /class="seed-balance"|aria-label="Seed count:/);
  assert.doesNotMatch(styles, /\.seed-balance/);
});

test("public startup loads checkout settings before deferred community content", () => {
  const app = readRepositoryFile("src/app.js");
  const bootstrap = readRepositoryFile("supabase/functions/public-bootstrap/index.ts");

  assert.match(app, /loadBackendData\(\{ mode: "critical" \}\)/);
  assert.doesNotMatch(app, /preloadPayPalSdk|paypalWarmup/);
  assert.match(app, /loadBackendData\(\{ mode: "content" \}\)/);
  assert.doesNotMatch(app, /waitForInitialAssets/);
  assert.match(bootstrap, /requestedMode === "critical" \|\| requestedMode === "content"/);
  assert.match(bootstrap, /Promise\.all\(\[\s*supabase[\s\S]*\.from\("donations"\)[\s\S]*\.from\("seed_comments"\)/);
});

test("support goal uses today's confirmed seed payments and resets every 100 seeds", () => {
  const html = readRepositoryFile("index.html");
  const app = readRepositoryFile("src/app.js");
  const bootstrap = readRepositoryFile("supabase/functions/public-bootstrap/index.ts");

  assert.match(html, /id="supportGoal"[\s\S]*id="supportGoalFill"[\s\S]*id="supportGoalPercent"/);
  assert.match(app, /function renderGoalProgress\(\)[\s\S]*confirmedSeedCount[\s\S]*goalSeedCount/);
  assert.match(bootstrap, /\.eq\("paypal_status", "COMPLETED"\)/);
  assert.match(bootstrap, /\.eq\("payment_route", "standard"\)/);
  assert.match(bootstrap, /\.gte\("created_at", getIndiaDayStart\(\)\)/);
  assert.match(bootstrap, /Math\.floor\(confirmedSeedAmount \/ 7\)/);
  assert.match(bootstrap, /todayConfirmedSeedCount % 100/);
  assert.match(bootstrap, /goalSeedCount: 100[\s\S]*percentage: confirmedSeedCount/);
  assert.match(bootstrap, /confirmedSeedDonations[\s\S]*visibility_scope === "public"/);
});

test("failed and cancelled PayPal payments open the seed-not-sown dialog", () => {
  const html = readRepositoryFile("index.html");
  const app = readRepositoryFile("src/app.js");
  const styles = readRepositoryFile("src/styles.css");

  assert.match(html, /id="paymentFailureDialog"[\s\S]*Your Seed Was Not Sown\.\.\.[\s\S]*id="retryPaymentButton"[\s\S]*SOW YOUR SEED NOW[\s\S]*Galatians 6:7/);
  assert.match(app, /INSTRUMENT_DECLINED[\s\S]*closeInlinePayPalCheckout\(\)[\s\S]*openPaymentFailure\("paypal"\)/);
  assert.match(app, /onCancel:[\s\S]*closeInlinePayPalCheckout\(\)[\s\S]*openPaymentFailure\("paypal"\)/);
  assert.match(app, /onError:[\s\S]*PayPal checkout failed[\s\S]*closeInlinePayPalCheckout\(\)[\s\S]*openPaymentFailure\("paypal"\)/);
  assert.match(app, /function openPaymentFailure\(source = alternateCheckoutSource\)[\s\S]*alternateCheckoutSource = source/);
  assert.match(app, /retryPaymentButton\?\.addEventListener[\s\S]*closePaymentFailure\(true\)/);
  assert.doesNotMatch(app, /function closeAlternateCheckout\([^)]*\) \{[\s\S]*?requestAnimationFrame\(openPaymentFailure\)/);
  assert.match(app, /closeAlternateCheckoutButton\?\.addEventListener\("click", closeAlternateCheckout\)/);
  assert.doesNotMatch(app, /closeAlternateCheckout\(true\)/);
  assert.match(styles, /\.payment-failure-card\s*\{[\s\S]*linear-gradient\(180deg, #1c1720 0%, #0f0c12 100%\)/);
});

test("cancelled Dodo payments open the seed-not-sown dialog", () => {
  const checkout = readRepositoryFile("src/home-dodo-checkout.js");

  assert.match(checkout, /returnToDodoFormWithFailure[\s\S]*openPaymentFailure\?\.\("dodo"\)/);
  assert.match(checkout, /params\.get\("dodo_cancelled"\) === "1"[\s\S]*returnToDodoFormWithFailure\(\)/);
  assert.doesNotMatch(checkout, /Dodo payment was cancelled\. You can try again when you are ready\./);
});

test("edge requests normalize the configured CORS origin and hide alternate cards by default", () => {
  const http = readRepositoryFile("supabase/functions/_shared/http.ts");
  const html = readRepositoryFile("index.html");
  const app = readRepositoryFile("src/app.js");

  assert.match(http, /new URL\(configuredOrigin\)\.origin/);
  assert.match(html, /id="dodoCardButton" hidden/);
  assert.match(html, /id="cardButton" hidden/);
  assert.match(app, /The payment service could not be reached\. Check your connection and try again\./);
});

test("Google AdSense has been removed from active pages and settings", () => {
  const pages = [
    "index.html",
    "privacy-policy.html",
    "delivery-fulfillment-policy.html",
  ];
  for (const page of pages) {
    const html = readRepositoryFile(page);
    assert.doesNotMatch(html, /adsense|google-adsense|ca-pub/i);
  }
  assert.doesNotMatch(readRepositoryFile("src/app.js"), /adsense|SeedGardenAdsense/i);
  assert.doesNotMatch(readRepositoryFile("supabase/functions/admin-settings/index.ts"), /adsense/i);
  assert.equal(existsSync(path.join(repositoryRoot, "src/adsense.js")), false);
  assert.equal(existsSync(path.join(repositoryRoot, "ads.txt")), false);
});

test("optimized page images stay within the initial transfer budget", () => {
  const html = readRepositoryFile("index.html");
  const imageBudgets = {
    "assets/sower-sunlit-cover.jpg": 260 * 1024,
  };

  for (const [assetPath, byteBudget] of Object.entries(imageBudgets)) {
    assert.match(html, new RegExp(assetPath.replace(".", "\\.")));
    assert.ok(statSync(path.join(repositoryRoot, assetPath)).size <= byteBudget, `${assetPath} exceeds its byte budget`);
  }

  assert.doesNotMatch(html, /assets\/(?:jesus-profile|sow-cover)\.(?:jpg|png)/);
});

test("the separate alternate card link opens a same-page popup and then disables", () => {
  const html = readRepositoryFile("index.html");
  const app = readRepositoryFile("src/app.js");
  const styles = readRepositoryFile("src/styles.css");

  assert.match(html, /id="paypalCheckoutLoader"[\s\S]*paypal-checkout-loader-seed[\s\S]*🌱[\s\S]*Preparing your seed…/);
  assert.doesNotMatch(html, /id="paypalCheckoutRetry"/);
  assert.match(app, /async function renderFreshPayPalButtons\(\)[\s\S]*const route = getCheckoutRoute\(\)/);
  assert.match(app, /await loadBackendData\(\{ mode: "critical", throwOnError: true \}\)/);
  assert.match(app, /resetAllPayPalSdks\(\)[\s\S]*const paypal = await loadPayPalSdk\(\)/);
  assert.match(app, /const paypal = await loadPayPalSdk\(\)/);
  assert.match(app, /await paypalButtons\.render\(ui\.paypalButtonContainer\)/);
  assert.match(app, /waitForRenderedPayPalButton/);
  assert.match(app, /querySelector\("iframe"\)/);
  assert.match(app, /paypal\.Buttons\(buildPayPalButtonOptions\(paypal, paypal\.FUNDING\.CARD\)\)/);
  assert.match(app, /await paypalCardButtons\.render\(ui\.paypalCardButtonContainer\)/);
  assert.match(app, /waitForRenderedPayPalButton\(ui\.paypalCardButtonContainer/);
  assert.match(
    html,
    /id="alternateCardCheckoutLink"[\s\S]*href="https:\/\/sowseed-receiver-seed-alternate-server\.vercel\.app\/"[\s\S]*aria-haspopup="dialog"[\s\S]*aria-controls="alternateCheckoutDialog"/,
  );
  assert.match(html, /id="alternateCheckoutDialog"[\s\S]*id="alternateCheckoutFrame"[\s\S]*src="about:blank"[\s\S]*allow="payment"/);
  assert.match(html, /class="alternate-checkout-fallback"[\s\S]*<strong>If the server is down try other debit card payment button<\/strong>/);
  assert.match(html, /id="cardButton"[\s\S]*id="alternateCardCheckoutLink"[\s\S]*id="paypalButton"[\s\S]*id="paypalCardButton"/);
  assert.match(html, /class="preferred-payment-label"[\s\S]*Preferred/);
  assert.doesNotMatch(html, /Server Busy Try Other|id="alternateCardStatus"/);
  assert.doesNotMatch(app, /resetPayPalCardReveal|is-covered|is-fading/);
  assert.match(app, /function openAlternateCheckout\(link\)[\s\S]*alternateCheckoutFrame\.src = checkoutUrl[\s\S]*alternateCheckoutDialog\.showModal\(\)/);
  assert.match(app, /\[elements\.alternateCardCheckoutLink, elements\.dodoAlternateCardCheckoutLink\][\s\S]*link\?\.addEventListener\("click", \(event\)[\s\S]*event\.preventDefault\(\)[\s\S]*classList\.contains\("is-disabled"\)[\s\S]*classList\.add\("is-disabled"\)[\s\S]*setAttribute\("aria-disabled", "true"\)[\s\S]*openAlternateCheckout\(link\)/);
  assert.match(app, /setPaymentStatus\(paypalCardEligible \|\| state\.settings\.alternateCardCheckoutVisible[\s\S]*"Choose a debit\/credit card or PayPal to continue"/);
  assert.match(styles, /\.alternate-card-link\s*\{/);
  assert.match(styles, /\.alternate-card-link\s*\{[^}]*background: #0070ba[\s\S]*font-family: Arial, Helvetica, sans-serif[\s\S]*font-weight: 600/s);
  assert.match(styles, /\.card-choice\.is-disabled \.alternate-card-link\s*\{\s*display: none;/);
  assert.match(styles, /\.card-choice\.is-disabled \.alternate-card-retry\s*\{\s*display: block;/);
  assert.match(html, /id="alternateCardCheckoutLink"[\s\S]*class="alternate-card-retry"[^>]*>Try Again<\/p>/);
  assert.match(styles, /\.card-choice\.is-disabled \.preferred-payment-label\s*\{[\s\S]*display: none/);
  assert.match(styles, /\.alternate-checkout-dialog\s*\{[\s\S]*height: min\(880px, calc\(100dvh - 24px\)\)/);
  assert.match(styles, /\.alternate-checkout-frame\s*\{[\s\S]*width: 100%[\s\S]*height: 100%/);
  assert.match(styles, /\.inline-paypal-checkout\.is-loading \.payment-choice\s*\{[\s\S]*opacity: 0/);
  assert.match(styles, /\.paypal-checkout-loader[\s\S]*background: linear-gradient/);
  assert.match(styles, /\.paypal-checkout-loader-seed[\s\S]*animation: app-loader-spin/);
});
