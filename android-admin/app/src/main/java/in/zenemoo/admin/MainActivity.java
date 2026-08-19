package in.zenemoo.admin;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String ADMIN_PORTAL_URL = "https://www.zenemoo.in/portal/9KqvA2Nz8";

    private static final String OFFLINE_HTML = "<!DOCTYPE html>" +
            "<html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
            "<title>Zenemoo Admin - Connection Error</title>" +
            "<style>" +
            "body { background-color: #050505; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 24px; box-sizing: border-box; }" +
            ".logo { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; letter-spacing: -0.5px; }" +
            ".badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 20px; padding: 4px 12px; margin-bottom: 16px; }" +
            ".card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 32px 24px; max-width: 360px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }" +
            "h2 { font-size: 20px; font-weight: 600; margin: 0 0 10px 0; color: #ffffff; }" +
            "p { font-size: 14px; color: #9ca3af; line-height: 1.5; margin: 0 0 24px 0; }" +
            ".btn { display: inline-block; width: 100%; padding: 12px 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; font-size: 15px; font-weight: 600; border: none; border-radius: 10px; cursor: pointer; transition: opacity 0.2s; box-sizing: border-box; text-decoration: none; }" +
            ".btn:active { opacity: 0.8; }" +
            "</style></head><body>" +
            "<div class=\"card\">" +
            "<div class=\"logo\">Zenemoo Admin</div>" +
            "<div class=\"badge\">Enterprise Portal Shell</div>" +
            "<h2>You're Offline</h2>" +
            "<p>Please check your network settings and try again to access the Zenemoo Enterprise Admin Portal.</p>" +
            "<button class=\"btn\" onclick=\"window.location.href='" + ADMIN_PORTAL_URL + "'\">Retry Connection</button>" +
            "</div></body></html>";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        int darkColor = Color.parseColor("#050505");

        // Edge-to-Edge & System Bar Customization for Zenemoo Admin Visual Identity (#050505)
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

        // Set decor view background color to #050505
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

            // Enable WebRTC Camera & Microphone permission handling
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (request != null && request.getResources() != null) {
                            request.grant(request.getResources());
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

                    // Keep internal domains & admin portal paths inside WebView
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
                        view.loadDataWithBaseURL(ADMIN_PORTAL_URL, OFFLINE_HTML, "text/html", "UTF-8", null);
                    }
                    if (defaultClient != null) {
                        defaultClient.onReceivedError(view, request, error);
                    }
                }
            });
        }

        // Handle Android Back Navigation gracefully for Admin Portal
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView view = getBridge().getWebView();
                if (view != null && view.canGoBack()) {
                    view.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }
}
