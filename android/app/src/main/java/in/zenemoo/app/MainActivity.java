package in.zenemoo.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int RECORD_AUDIO_REQUEST_CODE = 1002;
    private PermissionRequest pendingPermissionRequest = null;

    private static final String OFFLINE_HTML = "<!DOCTYPE html>" +
            "<html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
            "<title>Zenemoo - Connection Error</title>" +
            "<style>" +
            "body { background-color: #050505; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 24px; box-sizing: border-box; }" +
            ".logo { font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; letter-spacing: -0.5px; }" +
            ".card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 32px 24px; max-width: 360px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }" +
            "h2 { font-size: 20px; font-weight: 600; margin: 0 0 10px 0; color: #ffffff; }" +
            "p { font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0 0 24px 0; }" +
            ".btn { display: inline-block; width: 100%; padding: 12px 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; font-size: 15px; font-weight: 600; border: none; border-radius: 10px; cursor: pointer; transition: opacity 0.2s; box-sizing: border-box; text-decoration: none; }" +
            ".btn:active { opacity: 0.8; }" +
            "</style></head><body>" +
            "<div class=\"card\">" +
            "<div class=\"logo\">Zenemoo</div>" +
            "<h2>No Internet Connection</h2>" +
            "<p>Please check your network settings and try again to access Zenemoo Enterprise AI services.</p>" +
            "<button class=\"btn\" onclick=\"window.location.href='https://www.zenemoo.in'\">Retry Connection</button>" +
            "</div></body></html>";

    /**
     * Native Bridge exposed to JavaScript WebView for rock-solid runtime permission management
     */
    public class ZenemooNativeBridge {
        @JavascriptInterface
        public boolean isMicrophoneGranted() {
            return ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public boolean isPermissionPermanentlyDenied() {
            boolean notGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED;
            if (!notGranted) return false;
            return !ActivityCompat.shouldShowRequestPermissionRationale(MainActivity.this, Manifest.permission.RECORD_AUDIO);
        }

        @JavascriptInterface
        public void requestMicrophonePermission() {
            runOnUiThread(() -> {
                ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    RECORD_AUDIO_REQUEST_CODE
                );
            });
        }

        @JavascriptInterface
        public void openAppSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                Uri uri = Uri.fromParts("package", getPackageName(), null);
                intent.setData(uri);
                startActivity(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        int darkColor = Color.parseColor("#050505");

        // Edge-to-Edge & System Bar Customization for Zenemoo Visual Identity (#050505)
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(darkColor);
        window.setNavigationBarColor(darkColor);

        // Display Cutout / Notch Layout blending
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        // Configure light icons on dark status & navigation bars
        WindowInsetsControllerCompat insetsController = new WindowInsetsControllerCompat(window, window.getDecorView());
        insetsController.setAppearanceLightStatusBars(false);
        insetsController.setAppearanceLightNavigationBars(false);

        // Set decor view background color to #050505 to eliminate any white flash
        window.getDecorView().setBackgroundColor(darkColor);

        // Configure WebView settings & handlers
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setBackgroundColor(darkColor);

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Enable Cookies
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // Expose Native Bridge for Direct OS Permission Control
            webView.addJavascriptInterface(new ZenemooNativeBridge(), "ZenemooNativeBridge");

            // WebRTC Camera & Microphone permission handling with OS Runtime Fallback
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (request != null && request.getResources() != null) {
                            boolean needsAudio = false;
                            for (String r : request.getResources()) {
                                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
                                    needsAudio = true;
                                    break;
                                }
                            }

                            if (needsAudio && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                                pendingPermissionRequest = request;
                                ActivityCompat.requestPermissions(
                                    MainActivity.this,
                                    new String[]{Manifest.permission.RECORD_AUDIO},
                                    RECORD_AUDIO_REQUEST_CODE
                                );
                            } else {
                                request.grant(request.getResources());
                            }
                        }
                    });
                }
            });

            // Setup custom WebViewClient interceptor for links & network errors
            WebViewClient defaultClient = webView.getWebViewClient();
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl() != null ? request.getUrl().toString() : "";
                    return handleUrl(view, url) || (defaultClient != null && defaultClient.shouldOverrideUrlLoading(view, request));
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    return handleUrl(view, url) || (defaultClient != null && defaultClient.shouldOverrideUrlLoading(view, url));
                }

                private boolean handleUrl(WebView view, String url) {
                    if (url == null || url.isEmpty()) return false;

                    // Keep internal domains inside the WebView
                    if (url.startsWith("https://www.zenemoo.in") ||
                        url.startsWith("https://zenemoo.in") ||
                        url.startsWith("https://zenemootech-api.onrender.com") ||
                        url.contains("supabase.co") ||
                        url.contains("cloudinary.com") ||
                        url.startsWith("capacitor://") ||
                        url.startsWith("http://localhost")) {
                        return false; // Load inside WebView
                    }

                    // Open external links in system browser / app
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    if (request != null && request.isForMainFrame()) {
                        view.loadDataWithBaseURL("https://www.zenemoo.in", OFFLINE_HTML, "text/html", "UTF-8", null);
                    }
                    if (defaultClient != null) {
                        defaultClient.onReceivedError(view, request, error);
                    }
                }
            });
        }

        // Handle Android Back Navigation gracefully
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView view = getBridge() != null ? getBridge().getWebView() : null;
                if (view != null && view.canGoBack()) {
                    view.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });

        // Process notification intent on cold start
        handlePushIntent(getIntent());
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == RECORD_AUDIO_REQUEST_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                    pendingPermissionRequest = null;
                }
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('zenemoo:mic-permission-granted'));", null));
                }
            } else {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.deny();
                    pendingPermissionRequest = null;
                }
                boolean isPermanent = !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.RECORD_AUDIO);
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('zenemoo:mic-permission-denied', { detail: { permanent: " + isPermanent + " } }));", null));
                }
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handlePushIntent(intent);
    }

    private void handlePushIntent(Intent intent) {
        if (intent != null && intent.getExtras() != null) {
            Bundle extras = intent.getExtras();
            String rawUrl = extras.getString("url");
            if (rawUrl == null || rawUrl.isEmpty()) {
                rawUrl = extras.getString("link");
            }
            if (rawUrl == null || rawUrl.isEmpty()) {
                rawUrl = extras.getString("path");
            }
            if (rawUrl != null && !rawUrl.isEmpty()) {
                String targetUrl = rawUrl.startsWith("/") ? "https://www.zenemoo.in" + rawUrl : rawUrl;
                if (targetUrl.startsWith("https://www.zenemoo.in") || targetUrl.startsWith("https://zenemoo.in")) {
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null) {
                        webView.postDelayed(() -> webView.loadUrl(targetUrl), 600);
                    }
                }
            }
        }
    }
}
