package in.zenemoo.admin;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;

public class MainActivity extends BridgeActivity {

    private static final String ADMIN_PORTAL_URL = "https://www.zenemoo.in/portal/9KqvA2Nz8";
    private static final String PREFS_NAME = "ZenemooAdminBiometricPrefs";
    private static final String KEY_BIOMETRIC_ENABLED = "biometric_enabled";
    private static final String KEY_PROMPT_ASKED = "prompt_asked";

    private static final int FILECHOOSER_RESULTCODE = 2001;
    private static final int PERMISSION_REQUEST_CODE_FILE = 2002;
    private static final int PERMISSION_REQUEST_CODE_CAMERA_MIC = 2003;

    private ValueCallback<Uri[]> mUploadMessage;
    private WebChromeClient.FileChooserParams mFileChooserParams;
    private PermissionRequest mPendingWebPermissionRequest;

    private View biometricOverlayView;
    private boolean isOverlayVisible = false;
    private SharedPreferences prefs;

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

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        Window window = getWindow();
        int darkColor = Color.parseColor("#050505");

        // Edge-to-Edge & System Bar Customization for Zenemoo Admin (#050505)
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

            // WebChromeClient: File Chooser & Camera / Microphone WebRTC handling
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    if (mUploadMessage != null) {
                        mUploadMessage.onReceiveValue(null);
                        mUploadMessage = null;
                    }
                    mUploadMessage = filePathCallback;
                    mFileChooserParams = fileChooserParams;

                    if (hasFilePermissions()) {
                        launchFileChooser();
                    } else {
                        requestFilePermissions();
                    }
                    return true;
                }

                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    mPendingWebPermissionRequest = request;
                    if (hasCameraAndMicPermissions()) {
                        grantPendingWebPermissions();
                    } else {
                        requestCameraAndMicPermissions();
                    }
                }
            });

            // Setup custom WebViewClient interceptor for links, network errors & biometric enable prompt
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
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    if (defaultClient != null) {
                        defaultClient.onPageFinished(view, url);
                    }

                    // Check if administrator has authenticated for the first time and ask to enable biometrics once
                    checkAndPromptBiometricEnable(view);
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
                if (isOverlayVisible) {
                    moveTaskToBack(true);
                    return;
                }
                WebView view = getBridge().getWebView();
                if (view != null && view.canGoBack()) {
                    view.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });

        // Initialize Biometric Unlock Overlay if Biometric is enabled
        setupBiometricOverlayIfEnabled();
    }

    // ==========================================
    // RUNTIME PERMISSION & FILE PICKER HELPERS
    // ==========================================

    private boolean hasFilePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED ||
                   ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_VIDEO) == PackageManager.PERMISSION_GRANTED ||
                   ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private void requestFilePermissions() {
        List<String> permissions = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES);
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO);
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        }
        ActivityCompat.requestPermissions(this, permissions.toArray(new String[0]), PERMISSION_REQUEST_CODE_FILE);
    }

    private boolean hasCameraAndMicPermissions() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED &&
               ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestCameraAndMicPermissions() {
        ActivityCompat.requestPermissions(
            this,
            new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO},
            PERMISSION_REQUEST_CODE_CAMERA_MIC
        );
    }

    private void grantPendingWebPermissions() {
        if (mPendingWebPermissionRequest != null) {
            runOnUiThread(() -> {
                if (mPendingWebPermissionRequest != null && mPendingWebPermissionRequest.getResources() != null) {
                    mPendingWebPermissionRequest.grant(mPendingWebPermissionRequest.getResources());
                }
                mPendingWebPermissionRequest = null;
            });
        }
    }

    private void launchFileChooser() {
        try {
            Intent intent = null;
            if (mFileChooserParams != null) {
                intent = mFileChooserParams.createIntent();
            }
            if (intent == null) {
                intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
            }
            startActivityForResult(Intent.createChooser(intent, "Select File for Zenemoo Admin"), FILECHOOSER_RESULTCODE);
        } catch (Exception e) {
            cancelFileChooser();
            Toast.makeText(this, "Unable to open file picker", Toast.LENGTH_SHORT).show();
        }
    }

    private void cancelFileChooser() {
        if (mUploadMessage != null) {
            mUploadMessage.onReceiveValue(null);
            mUploadMessage = null;
        }
    }

    private void openAppSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getPackageName(), null);
            intent.setData(uri);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Please open Android Settings to grant permissions", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE_FILE) {
            boolean granted = false;
            for (int result : grantResults) {
                if (result == PackageManager.PERMISSION_GRANTED) {
                    granted = true;
                    break;
                }
            }

            if (granted) {
                if (mUploadMessage != null) {
                    launchFileChooser();
                }
            } else {
                boolean shouldShowRationale = false;
                for (String perm : permissions) {
                    if (ActivityCompat.shouldShowRequestPermissionRationale(this, perm)) {
                        shouldShowRationale = true;
                        break;
                    }
                }

                if (shouldShowRationale) {
                    new AlertDialog.Builder(this)
                            .setTitle("Permission Required")
                            .setMessage("Zenemoo Admin needs file access to upload datasets and media.")
                            .setPositiveButton("Try Again", (dialog, which) -> requestFilePermissions())
                            .setNegativeButton("Cancel", (dialog, which) -> cancelFileChooser())
                            .setCancelable(false)
                            .show();
                } else {
                    new AlertDialog.Builder(this)
                            .setTitle("Permission Denied")
                            .setMessage("File permission was permanently denied. Please allow file access in App Settings to upload datasets.")
                            .setPositiveButton("Open Settings", (dialog, which) -> {
                                cancelFileChooser();
                                openAppSettings();
                            })
                            .setNegativeButton("Cancel", (dialog, which) -> cancelFileChooser())
                            .setCancelable(false)
                            .show();
                }
            }
        } else if (requestCode == PERMISSION_REQUEST_CODE_CAMERA_MIC) {
            if (hasCameraAndMicPermissions()) {
                grantPendingWebPermissions();
            } else {
                Toast.makeText(this, "Camera and Microphone permissions are required for media capture", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (mUploadMessage == null) return;
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            mUploadMessage.onReceiveValue(results);
            mUploadMessage = null;
        }
    }

    // ==========================================
    // NATIVE BIOMETRIC UNLOCK CONTROLLER
    // ==========================================

    private void setupBiometricOverlayIfEnabled() {
        boolean isBiometricEnabled = prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false);

        if (isBiometricEnabled) {
            showUnlockOverlay();
            // Automatically launch system biometric prompt on launch
            showBiometricPrompt();
        }
    }

    private void showUnlockOverlay() {
        if (biometricOverlayView == null) {
            LayoutInflater inflater = LayoutInflater.from(this);
            biometricOverlayView = inflater.inflate(R.layout.biometric_unlock_overlay, null);

            Button btnBiometrics = biometricOverlayView.findViewById(R.id.btn_use_biometrics);
            Button btnEmailPassword = biometricOverlayView.findViewById(R.id.btn_use_email_password);

            btnBiometrics.setOnClickListener(v -> showBiometricPrompt());
            btnEmailPassword.setOnClickListener(v -> hideUnlockOverlay());

            ViewGroup rootView = findViewById(android.R.id.content);
            if (rootView != null) {
                rootView.addView(biometricOverlayView);
            }
        } else {
            biometricOverlayView.setVisibility(View.VISIBLE);
        }
        isOverlayVisible = true;
    }

    private void hideUnlockOverlay() {
        if (biometricOverlayView != null) {
            biometricOverlayView.setVisibility(View.GONE);
        }
        isOverlayVisible = false;
    }

    private void showBiometricPrompt() {
        BiometricManager biometricManager = BiometricManager.from(this);
        int canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK
        );

        if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
            Toast.makeText(this, "Biometric authentication unavailable on this device", Toast.LENGTH_SHORT).show();
            hideUnlockOverlay();
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(this);
        BiometricPrompt biometricPrompt = new BiometricPrompt(this, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                super.onAuthenticationSucceeded(result);
                // Authentication succeeded! Unlock session and reveal Admin Portal
                hideUnlockOverlay();
                Toast.makeText(MainActivity.this, "Welcome to Zenemoo Admin", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                // Do not lock out user; user can tap 'Use Email & Password'
            }

            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
                // Retries allowed by Android System Biometric dialog
            }
        });

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock Zenemoo Admin")
                .setSubtitle("Confirm fingerprint or face to access Zenemoo Admin")
                .setNegativeButtonText("Use Email & Password")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK)
                .build();

        biometricPrompt.authenticate(promptInfo);
    }

    private void checkAndPromptBiometricEnable(WebView view) {
        boolean promptAsked = prefs.getBoolean(KEY_PROMPT_ASKED, false);
        boolean biometricEnabled = prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false);

        if (promptAsked || biometricEnabled) {
            return;
        }

        // Evaluate if user is logged into the Admin Portal via localStorage token or cookies
        view.evaluateJavascript(
            "(function() { return !!localStorage.getItem('zenemoo_jwt_token') || document.cookie.indexOf('sb-access-token') !== -1; })();",
            value -> {
                if ("true".equals(value)) {
                    runOnUiThread(this::showEnableBiometricDialog);
                }
            }
        );
    }

    private void showEnableBiometricDialog() {
        BiometricManager biometricManager = BiometricManager.from(this);
        int canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK
        );

        if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
            // Device has no supported biometrics; do not prompt
            prefs.edit().putBoolean(KEY_PROMPT_ASKED, true).apply();
            return;
        }

        new AlertDialog.Builder(this)
                .setTitle("Enable Biometric Login?")
                .setMessage("Would you like to enable biometric login (fingerprint or face) on this device for faster, secure unlock?")
                .setPositiveButton("Enable", (dialog, which) -> requestInitialBiometricRegistration())
                .setNegativeButton("Not Now", (dialog, which) -> {
                    prefs.edit().putBoolean(KEY_PROMPT_ASKED, true).putBoolean(KEY_BIOMETRIC_ENABLED, false).apply();
                })
                .setCancelable(false)
                .show();
    }

    private void requestInitialBiometricRegistration() {
        Executor executor = ContextCompat.getMainExecutor(this);
        BiometricPrompt biometricPrompt = new BiometricPrompt(this, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                super.onAuthenticationSucceeded(result);
                prefs.edit().putBoolean(KEY_BIOMETRIC_ENABLED, true).putBoolean(KEY_PROMPT_ASKED, true).apply();
                Toast.makeText(MainActivity.this, "Biometric login enabled successfully", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                prefs.edit().putBoolean(KEY_PROMPT_ASKED, true).putBoolean(KEY_BIOMETRIC_ENABLED, false).apply();
            }

            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
            }
        });

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Confirm Biometric Setup")
                .setSubtitle("Authenticate to enable biometric unlock for Zenemoo Admin")
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK)
                .build();

        biometricPrompt.authenticate(promptInfo);
    }
}
