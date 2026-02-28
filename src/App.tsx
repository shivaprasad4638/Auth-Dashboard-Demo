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
    const [user, setUser] = useState<{ email: string, role: string, avatarSeed?: string, avatarStyle?: string } | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);

    // Auto-fetch sessions when token changes
    useEffect(() => {
        if (accessToken) {
            getSessions();
        }
    }, [accessToken]);

    // Axios interceptor for transparent refresh on 401
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                // Avoid intercepting the refresh endpoint itself to prevent infinite loops
                if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && originalRequest.url !== "http://localhost:5000/api/auth/refresh") {
                    originalRequest._retry = true;
                    try {
                        const res = await axios.post("http://localhost:5000/api/auth/refresh");
                        setAccessToken(res.data.accessToken);
                        setUser(res.data.user);
                        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
                        return axios(originalRequest);
                    } catch (err) {
                        setAccessToken("");
                        setUser(null);
                        return Promise.reject(err);
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    // Try to refresh token on initial load
    useEffect(() => {
        const tryRefresh = async () => {
            try {
                const res = await axios.post("http://localhost:5000/api/auth/refresh");
                setAccessToken(res.data.accessToken);
                setUser(res.data.user);
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
            setUser(res.data.user);
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
            setUser(res.data.user);
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
            setUser(res.data.user);
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
                setUser(null);
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


    const logout = async () => {
        try {
            await axios.post("http://localhost:5000/api/auth/logout", {}, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setAccessToken("");
            setUser(null);
            showToast("Logged out successfully");
        } catch (error) {
            console.error(error);
            setErrorMsg("Failed to logout");
        }
    };

    const regenerateAvatar = async () => {
        try {
            const res = await axios.patch("http://localhost:5000/api/users/avatar/regenerate", {}, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setUser(res.data.user);
            showToast("Avatar regenerated!");
        } catch (error) {
            console.error(error);
            setErrorMsg("Failed to regenerate avatar");
        }
    };

    const updateAvatarStyle = async (style: string) => {
        try {
            const res = await axios.patch("http://localhost:5000/api/users/avatar/style", { style }, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setUser(res.data.user);
            showToast("Avatar style updated!");
        } catch (error) {
            console.error(error);
            setErrorMsg("Failed to update avatar style");
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
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                            <div className="avatar-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'var(--panel-bg)', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                {user?.avatarSeed ? (
                                    <img
                                        src={`https://api.dicebear.com/7.x/${user.avatarStyle || 'avataaars'}/svg?seed=${user.avatarSeed}`}
                                        alt="Avatar"
                                        className="profile-avatar"
                                        style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--border-color)', transition: 'transform 0.3s ease' }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    />
                                ) : (
                                    <div className="profile-avatar" style={{ width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--border-color)' }}>
                                        👤
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button className="btn btn-primary" style={{ padding: '0.4rem', fontSize: '0.85rem' }} onClick={regenerateAvatar}>
                                        🎲 Regenerate
                                    </button>
                                    <select
                                        className="input-field"
                                        style={{ padding: '0.4rem', fontSize: '0.85rem', marginBottom: '0' }}
                                        value={user?.avatarStyle || 'avataaars'}
                                        onChange={(e) => updateAvatarStyle(e.target.value)}
                                    >
                                        <option value="avataaars">Cartoon</option>
                                        <option value="bottts">Robot</option>
                                        <option value="pixel-art">Pixel</option>
                                        <option value="lorelei">Lorelei</option>
                                        <option value="initials">Initials</option>
                                        <option value="adventurer">Adventurer</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginTop: '0.5rem' }}>
                                <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Welcome, {user?.email || "User"}!</h2>
                                <p style={{ color: "var(--text-color)", opacity: 0.8, marginTop: "0.25rem" }}>
                                    Security Dashboard
                                </p>
                                {user && (
                                    <div style={{ marginTop: "15px", display: 'flex', gap: '10px' }}>
                                        <span className="status-badge status-active" style={{ textTransform: "capitalize", position: "relative", top: "0", right: "0", fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>
                                            Role: {user.role}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="header-actions">
                                <button className="btn btn-primary" onClick={getSessions}>
                                    🔄 Refresh
                                </button>
                                <button className="btn btn-danger-filled" onClick={logout}>
                                    Logout
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
                </div>
            )}
        </div>
    );
}

export default App;
