import { useState, useEffect } from "react";
import axios from "axios";

// Enable sending cookies in cross-origin requests
axios.defaults.withCredentials = true;

function App() {
    const [email, setEmail] = useState("test@example.com");
    const [password, setPassword] = useState("Password123!");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [authMode, setAuthMode] = useState<"login" | "phone" | "register">("login");
    const [otpSent, setOtpSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [toast, setToast] = useState("");

    const [accessToken, setAccessToken] = useState("");
    const [sessions, setSessions] = useState<any[]>([]);

    // Auto-fetch sessions when token changes
    useEffect(() => {
        if (accessToken) {
            getSessions();
        }
    }, [accessToken]);

    // Try to refresh token on initial load
    useEffect(() => {
        const tryRefresh = async () => {
            try {
                const res = await axios.post("http://localhost:5000/api/auth/refresh");
                setAccessToken(res.data.accessToken);
            } catch (error) {
                // Ignore, user is not logged in / no valid refresh token
            }
        };
        tryRefresh();
    }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    const validatePassword = (pass: string) => {
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(pass);
    };

    const validateEmail = (mail: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(mail);
    };

    const register = async () => {
        setErrorMsg("");
        if (!validateEmail(email)) {
            setErrorMsg("Invalid email format.");
            return;
        }
        if (!validatePassword(password)) {
            setErrorMsg("Password must be at least 8 characters long, contain 1 uppercase letter, 1 number, and 1 special character.");
            return;
        }
        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post("http://localhost:5000/api/auth/register", {
                email,
                password,
            });
            setAccessToken(res.data.accessToken);
            showToast("Registration successful!");
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    const login = async () => {
        setErrorMsg("");
        setIsLoading(true);
        try {
            const res = await axios.post("http://localhost:5000/api/auth/login", {
                email,
                password,
            });
            setAccessToken(res.data.accessToken);
            showToast("Welcome back!");
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const sendOtp = async () => {
        setErrorMsg("");
        setIsLoading(true);
        try {
            await axios.post("http://localhost:5000/api/auth/send-otp", {
                phoneNumber,
            });
            setOtpSent(true);
            showToast("OTP Sent!");
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Failed to send OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async () => {
        setErrorMsg("");
        setIsLoading(true);
        try {
            const res = await axios.post(
                "http://localhost:5000/api/auth/verify-otp",
                { phoneNumber, otp }
            );
            setAccessToken(res.data.accessToken);
            showToast("Login successful!");
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Invalid OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const getSessions = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/auth/sessions", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            setSessions(res.data);
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                setAccessToken(""); // Clear token if expired/invalid
            }
        }
    };

    const revokeSession = async (id: string) => {
        try {
            await axios.delete(`http://localhost:5000/api/auth/sessions/${id}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            getSessions();
            showToast("Session revoked");
        } catch (error) {
            console.error(error);
            setErrorMsg("Failed to revoke session");
        }
    };

    const revokeAll = async () => {
        if (!window.confirm("Are you sure you want to sign out everywhere?")) return;
        try {
            await axios.delete("http://localhost:5000/api/auth/sessions", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            getSessions();
            showToast("All sessions revoked");
        } catch (error) {
            console.error(error);
            setErrorMsg("Failed to revoke all sessions");
        }
    };

    // Helper to render password field with toggle
    const renderPasswordField = (value: string, onChange: (val: string) => void, placeholder: string) => (
        <div className="password-wrapper">
            <input
                className="input-field"
                type={showPassword ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
            >
                {showPassword ? "Hide" : "Show"}
            </button>
        </div>
    );

    return (
        <div className="dashboard-container">
            {toast && <div className="toast slide-up">{toast}</div>}

            {!accessToken ? (
                <div className="auth-card glass-panel">
                    <h2 style={{ textAlign: "center" }}>
                        {authMode === "login" || authMode === "phone" ? "Welcome Back" : "Create Account"}
                    </h2>

                    <div className="tabs">
                        <button
                            className={`tab-button ${authMode === "login" ? "active" : ""}`}
                            onClick={() => {
                                setAuthMode("login");
                                setErrorMsg("");
                            }}
                        >
                            Log In
                        </button>
                        <button
                            className={`tab-button ${authMode === "register" ? "active" : ""}`}
                            onClick={() => {
                                setAuthMode("register");
                                setErrorMsg("");
                            }}
                        >
                            Register
                        </button>
                        <button
                            className={`tab-button ${authMode === "phone" ? "active" : ""}`}
                            onClick={() => {
                                setAuthMode("phone");
                                setErrorMsg("");
                            }}
                        >
                            Phone
                        </button>
                    </div>

                    {errorMsg && <div className="error-message">{errorMsg}</div>}

                    {authMode === "login" && (
                        <div className="form-group">
                            <input
                                className="input-field"
                                placeholder="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {renderPasswordField(password, setPassword, "Password")}
                            <button className="btn btn-primary" onClick={login} disabled={isLoading}>
                                {isLoading ? "Processing..." : "Sign In"}
                            </button>
                        </div>
                    )}

                    {authMode === "register" && (
                        <div className="form-group">
                            <input
                                className="input-field"
                                placeholder="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {renderPasswordField(password, setPassword, "Password (8+ chars, 1 uppercase, 1 number, 1 special)")}
                            {renderPasswordField(confirmPassword, setConfirmPassword, "Confirm Password")}
                            <button className="btn btn-primary" onClick={register} disabled={isLoading}>
                                {isLoading ? "Creating Account..." : "Register"}
                            </button>
                        </div>
                    )}

                    {authMode === "phone" && (
                        <div className="form-group">
                            <input
                                className="input-field"
                                placeholder="Phone Number (e.g., +1234567890)"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={otpSent}
                            />
                            {!otpSent ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={sendOtp}
                                    disabled={!phoneNumber || isLoading}
                                >
                                    {isLoading ? "Sending..." : "Send OTP"}
                                </button>
                            ) : (
                                <>
                                    <input
                                        className="input-field"
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        maxLength={6}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={verifyOtp}
                                        disabled={otp.length < 4 || isLoading}
                                    >
                                        {isLoading ? "Verifying..." : "Verify & Login"}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="glass-panel">
                    <div className="dashboard-header">
                        <div>
                            <h2>Active Sessions</h2>
                            <p style={{ color: "var(--text-color)", opacity: 0.8, marginTop: "0.25rem" }}>
                                Manage your devices and security
                            </p>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-primary" onClick={getSessions}>
                                🔄 Refresh
                            </button>
                            <button
                                className="btn btn-danger-filled"
                                onClick={revokeAll}
                                disabled={!sessions.length}
                            >
                                Sign Out Everywhere
                            </button>
                        </div>
                    </div>

                    {sessions.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-color)" }}>
                            <p>No active sessions found.</p>
                        </div>
                    ) : (
                        <div className="sessions-grid">
                            {sessions.map((s) => (
                                <div
                                    key={s.id}
                                    className={`session-card ${s.revokedAt ? "revoked" : "active"}`}
                                >
                                    <div className={`status-badge ${s.revokedAt ? "status-revoked" : "status-active"}`}>
                                        {s.revokedAt ? "Revoked" : "Active"}
                                    </div>

                                    <div className="session-detail">
                                        <strong>Device / Browser</strong>
                                        <span>{s.userAgent || "Unknown Device"}</span>
                                    </div>

                                    <div className="session-detail">
                                        <strong>IP Address</strong>
                                        <span>{s.ip}</span>
                                    </div>

                                    <div className="session-detail">
                                        <strong>Last Login</strong>
                                        <span>{new Date(s.createdAt).toLocaleString()}</span>
                                    </div>

                                    {!s.revokedAt && (
                                        <div className="session-actions">
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => revokeSession(s.id)}
                                            >
                                                Sign Out Device
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
