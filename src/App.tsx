import { useState, useEffect } from "react";
import axios from "axios";

// Enable sending cookies in cross-origin requests
axios.defaults.withCredentials = true;

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function App() {
    const [email, setEmail] = useState("test@example.com");
    const [password, setPassword] = useState("Password123!");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [twoFaCode, setTwoFaCode] = useState("");
    const [tempToken, setTempToken] = useState("");
    const [authMode, setAuthMode] = useState<"login" | "phone" | "register" | "2fa">("login");
    const [otpSent, setOtpSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [toast, setToast] = useState("");

    const [accessToken, setAccessToken] = useState("");
    const [user, setUser] = useState<{ email: string, role: string, avatarSeed?: string, avatarStyle?: string, twoFactorEnabled?: boolean } | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [qrCode, setQrCode] = useState("");
    const [setup2faCode, setSetup2faCode] = useState("");
    const [show2faSetup, setShow2faSetup] = useState(false);
    const [showRevoked, setShowRevoked] = useState(false);

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
                if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && originalRequest.url !== `${API_URL}/api/auth/refresh`) {
                    originalRequest._retry = true;
                    try {
                        const res = await axios.post(`${API_URL}/api/auth/refresh`);
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
                const res = await axios.post(`${API_URL}/api/auth/refresh`);
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
            const res = await axios.post(`${API_URL}/api/auth/register`, {
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
            const res = await axios.post(`${API_URL}/api/auth/login`, {
                email,
                password,
            });

            if (res.data.twoFactorRequired) {
                setTempToken(res.data.tempToken);
                setAuthMode("2fa");
                showToast("2FA Required");
            } else {
                setAccessToken(res.data.accessToken);
                setUser(res.data.user);
                showToast("Welcome back!");
            }
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const verify2Fa = async () => {
        setErrorMsg("");
        setIsLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/2fa/login`, {
                tempToken,
                code: twoFaCode,
            });
            setAccessToken(res.data.accessToken);
            setUser(res.data.user);
            setTempToken("");
            setTwoFaCode("");
            setAuthMode("login");
            showToast("Welcome back!");
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Invalid 2FA code");
        } finally {
            setIsLoading(false);
        }
    };

    const sendOtp = async () => {
        setErrorMsg("");
        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/send-otp`, {
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
                `${API_URL}/api/auth/verify-otp`,
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
            const res = await axios.get(`${API_URL}/api/auth/sessions`, {
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
            await axios.delete(`${API_URL}/api/auth/sessions/${id}`, {
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
            await axios.post(`${API_URL}/api/auth/logout`, {}, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setAccessToken("");
            setUser(null);
            setQrCode("");
            setShow2faSetup(false);
            showToast("Logged out successfully");
        } catch (error) {
            console.error(error);
            setErrorMsg("Failed to logout");
        }
    };

    const enable2fa = async () => {
        setErrorMsg("");
        setIsLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/2fa/enable`, {}, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setQrCode(res.data.qrCode);
            setShow2faSetup(true);
            showToast("Scan the QR code with your authenticator app!");
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Failed to start 2FA setup");
        } finally {
            setIsLoading(false);
        }
    };

    const confirm2fa = async () => {
        setErrorMsg("");
        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/2fa/confirm`, { code: setup2faCode }, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setUser(prev => prev ? { ...prev, twoFactorEnabled: true } : prev);
            setQrCode("");
            setShow2faSetup(false);
            setSetup2faCode("");
            showToast("2FA enabled successfully! ðŸ”");
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Invalid code. Try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const disable2fa = async () => {
        setErrorMsg("");
        setIsLoading(true);
        try {
            await axios.delete(`${API_URL}/api/auth/2fa/disable`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setUser(prev => prev ? { ...prev, twoFactorEnabled: false } : prev);
            showToast("2FA disabled.");
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || "Failed to disable 2FA");
        } finally {
            setIsLoading(false);
        }
    };

    const regenerateAvatar = async () => {
        try {
            const res = await axios.patch(`${API_URL}/api/users/avatar/regenerate`, {}, {
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
            const res = await axios.patch(`${API_URL}/api/users/avatar/style`, { style }, {
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

                    {authMode === "2fa" && (
                        <div className="form-group slide-up">
                            <p style={{ textAlign: "center", marginBottom: "1rem" }}>
                                Enter the 6-digit code from your authenticator app.
                            </p>
                            <input
                                className="input-field"
                                placeholder="6-digit code"
                                type="text"
                                maxLength={6}
                                value={twoFaCode}
                                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={verify2Fa}
                                disabled={twoFaCode.length !== 6 || isLoading}
                            >
                                {isLoading ? "Verifying..." : "Verify"}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setAuthMode("login");
                                    setTempToken("");
                                }}
                                style={{ marginTop: "0.5rem" }}
                            >
                                Back to Login
                            </button>
                        </div>
                    )}

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>

                    {/* PANEL 1: Profile */}
                    <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%' }}>

                            {/* Avatar */}
                            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                {user?.avatarSeed ? (
                                    <img
                                        src={`https://api.dicebear.com/7.x/${user.avatarStyle || 'avataaars'}/svg?seed=${user.avatarSeed}`}
                                        alt="Avatar"
                                        style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--primary)', transition: 'transform 0.3s ease' }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.06)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                    />
                                ) : (
                                    <div style={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--panel-bg)', fontSize: '2rem' }}>&#128100;</div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                                    <button className="btn btn-sm btn-secondary" onClick={regenerateAvatar} style={{ fontSize: '0.78rem' }}>Regenerate</button>
                                    <select
                                        className="input-field"
                                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', marginBottom: 0 }}
                                        value={user?.avatarStyle || 'avataaars'}
                                        onChange={e => updateAvatarStyle(e.target.value)}
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

                            {/* Name + role */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="section-label" style={{ marginBottom: '0.25rem' }}>Signed in as</p>
                                <h2 style={{ fontSize: '1.3rem', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'User'}</h2>
                                <span className="status-badge status-active" style={{ position: 'relative', top: 0, right: 0, textTransform: 'capitalize' }}>
                                    {user?.role}
                                </span>
                            </div>

                            {/* Action cluster */}
                            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                <button className="btn btn-sm btn-secondary" onClick={getSessions}>Refresh Sessions</button>
                                <button className="btn btn-sm btn-danger-filled" onClick={logout}>Sign Out</button>
                            </div>
                        </div>
                    </div>

                    {/* PANEL 2: Sessions */}
                    <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
                        {(() => {
                            const currentSession = sessions.find(s => s.isCurrent);
                            const otherActive = sessions.filter(s => !s.isCurrent && !s.revokedAt);
                            const revoked = sessions.filter(s => s.revokedAt);

                            const SessionCard = ({ s, isCurrent = false }: { s: any, isCurrent?: boolean }) => (
                                <div
                                    className={`session-card ${s.revokedAt ? 'revoked' : 'active'}`}
                                    style={isCurrent ? { borderLeftColor: '#f59e0b', background: 'rgba(245,158,11,0.05)' } : {}}
                                >
                                    {/* Badge row — top right */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                        {isCurrent && (
                                            <span style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '0.12rem 0.5rem', borderRadius: '999px', fontWeight: 600, letterSpacing: '0.02em' }}>
                                                This Device
                                            </span>
                                        )}
                                        <span className={`status-badge ${s.revokedAt ? 'status-revoked' : 'status-active'}`} style={{ fontSize: '0.7rem' }}>
                                            {s.revokedAt ? 'Revoked' : 'Active'}
                                        </span>
                                    </div>
                                    <div className="session-detail">
                                        <strong>Device / Browser</strong>
                                        <span>{s.userAgent || 'Unknown Device'}</span>
                                    </div>
                                    <div className="session-detail">
                                        <strong>IP Address</strong>
                                        <span>{s.ip || '-'}</span>
                                    </div>
                                    <div className="session-detail">
                                        <strong>Login Time</strong>
                                        <span>{new Date(s.createdAt).toLocaleString()}</span>
                                    </div>
                                    {!s.revokedAt && !isCurrent && (
                                        <div className="session-actions">
                                            <button className="btn btn-sm btn-danger" onClick={() => revokeSession(s.id)}>Sign Out Device</button>
                                        </div>
                                    )}
                                    {isCurrent && (
                                        <p style={{ fontSize: '0.78rem', opacity: 0.35, marginTop: '0.5rem', fontStyle: 'italic' }}>Use &ldquo;Sign Out&rdquo; above to end this session.</p>
                                    )}
                                </div>
                            );

                            return (
                                <>
                                    {/* Current Session */}
                                    {currentSession && (
                                        <div className="dashboard-section">
                                            <p className="section-label">Current Session</p>
                                            <SessionCard s={currentSession} isCurrent={true} />
                                        </div>
                                    )}

                                    {/* Other Active Sessions */}
                                    {otherActive.length > 0 && (
                                        <div className="dashboard-section" style={{ marginTop: currentSession ? '1.5rem' : 0 }}>
                                            <p className="section-label">
                                                Other Active Sessions{' '}
                                                <span style={{ background: 'rgba(88,166,255,0.15)', color: 'var(--primary)', padding: '0.1rem 0.45rem', borderRadius: '999px', fontWeight: 700 }}>
                                                    {otherActive.length}
                                                </span>
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {otherActive.map(s => <SessionCard key={s.id} s={s} />)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Revoked Sessions (collapsible) */}
                                    {revoked.length > 0 && (
                                        <div style={{ marginTop: '1.5rem' }}>
                                            <button
                                                onClick={() => setShowRevoked(v => !v)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: 0 }}
                                            >
                                                <span style={{ fontSize: '0.65rem', opacity: 0.4, transition: 'transform 0.2s', display: 'inline-block', transform: showRevoked ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9658;</span>
                                                <span className="section-label" style={{ marginBottom: 0 }}>Show revoked sessions</span>
                                            </button>
                                            {showRevoked && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                                                    {revoked.slice(0, 3).map(s => <SessionCard key={s.id} s={s} />)}
                                                    {revoked.length > 3 && (
                                                        <p style={{ fontSize: '0.8rem', opacity: 0.35, padding: '0.25rem 0' }}>+ {revoked.length - 3} older entries hidden.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {sessions.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.4 }}>No sessions found. Click Refresh to load.</div>
                                    )}
                                </>
                            );
                        })()}
                    </div>

                    {/* PANEL 3: Security Settings */}
                    <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
                        <p className="section-label">Security Settings</p>

                        {/* 2FA row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>Two-Factor Authentication</h3>
                                <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.5rem', lineHeight: 1.5 }}>
                                    {user?.twoFactorEnabled
                                        ? 'Your account is protected. A code from your authenticator app is required at each login.'
                                        : 'Add a second layer of security. You will need an authenticator app like Google Authenticator or Authy.'}
                                </p>
                                <span style={{
                                    display: 'inline-block', fontSize: '0.75rem', fontWeight: 700,
                                    padding: '0.2rem 0.65rem', borderRadius: '999px',
                                    background: user?.twoFactorEnabled ? 'rgba(46,160,67,0.15)' : 'rgba(248,81,73,0.08)',
                                    color: user?.twoFactorEnabled ? 'var(--success-text)' : 'var(--danger)',
                                    border: `1px solid ${user?.twoFactorEnabled ? 'var(--success-border)' : 'rgba(248,81,73,0.4)'}`,
                                }}>
                                    {user?.twoFactorEnabled ? 'Protected' : 'Protection Disabled'}
                                </span>
                            </div>
                            <div style={{ flexShrink: 0, paddingTop: '0.15rem' }}>
                                {!user?.twoFactorEnabled && !show2faSetup && (
                                    <button
                                        className="btn btn-sm"
                                        onClick={enable2fa}
                                        disabled={isLoading}
                                        style={{
                                            background: '#1a7f4b',
                                            color: '#fff',
                                            border: '1px solid rgba(46,160,67,0.4)',
                                            boxShadow: '0 0 12px rgba(46,160,67,0.25)',
                                        }}
                                    >
                                        {isLoading ? 'Generating...' : 'Enable Protection'}
                                    </button>
                                )}
                                {user?.twoFactorEnabled && (
                                    <button className="btn btn-sm btn-danger" onClick={disable2fa} disabled={isLoading}>
                                        {isLoading ? 'Disabling...' : 'Turn Off 2FA'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* QR Setup flow */}
                        {show2faSetup && qrCode && (
                            <div className="slide-up" style={{ marginTop: '1.25rem', padding: '1.25rem', background: 'var(--panel-bg)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <p style={{ fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.8 }}>
                                    Open <strong>Google Authenticator</strong> or <strong>Authy</strong>, scan the QR code, then enter the 6-digit code to activate.
                                </p>
                                <img src={qrCode} alt="2FA QR Code" style={{ width: 180, height: 180, borderRadius: '0.5rem', background: '#fff', padding: 8 }} />
                                <input
                                    className="input-field"
                                    placeholder="Enter 6-digit code"
                                    type="text"
                                    maxLength={6}
                                    value={setup2faCode}
                                    onChange={e => setSetup2faCode(e.target.value.replace(/\D/g, ''))}
                                    style={{ maxWidth: 200 }}
                                />
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button className="btn btn-sm btn-primary" onClick={confirm2fa} disabled={setup2faCode.length !== 6 || isLoading}>
                                        {isLoading ? 'Verifying...' : 'Activate 2FA'}
                                    </button>
                                    <button className="btn btn-sm btn-secondary" onClick={() => { setShow2faSetup(false); setQrCode(''); setSetup2faCode(''); }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
