import { useState, useEffect } from "react";
import axios from "axios";

function App() {
    const [email, setEmail] = useState("test@example.com");
    const [password, setPassword] = useState("Password123!");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [isPhoneLogin, setIsPhoneLogin] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const [accessToken, setAccessToken] = useState("");
    const [sessions, setSessions] = useState<any[]>([]);

    // Auto-fetch sessions when token changes
    useEffect(() => {
        if (accessToken) {
            getSessions();
        }
    }, [accessToken]);

    const login = async () => {
        try {
            const res = await axios.post("http://localhost:5000/api/auth/login", {
                email,
                password,
            });

            setAccessToken(res.data.accessToken);
            // Removed alert for a smoother experience; rely on state changes
        } catch (error: any) {
            alert(error.response?.data?.message || "Login failed");
        }
    };

    const sendOtp = async () => {
        try {
            await axios.post("http://localhost:5000/api/auth/send-otp", {
                phoneNumber,
            });
            setOtpSent(true);
            // Silently succeed, user sees OTP field
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to send OTP");
        }
    };

    const verifyOtp = async () => {
        try {
            const res = await axios.post(
                "http://localhost:5000/api/auth/verify-otp",
                { phoneNumber, otp }
            );
            setAccessToken(res.data.accessToken);
        } catch (error: any) {
            alert(error.response?.data?.message || "Invalid OTP");
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
        } catch (error) {
            console.error(error);
            alert("Failed to revoke session");
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
        } catch (error) {
            console.error(error);
            alert("Failed to revoke all sessions");
        }
    };

    return (
        <div className="dashboard-container">
            {!accessToken ? (
                <div className="auth-card glass-panel">
                    <h2 style={{ textAlign: "center" }}>Welcome Back</h2>

                    <div className="tabs">
                        <button
                            className={`tab-button ${!isPhoneLogin ? "active" : ""}`}
                            onClick={() => setIsPhoneLogin(false)}
                        >
                            Email Login
                        </button>
                        <button
                            className={`tab-button ${isPhoneLogin ? "active" : ""}`}
                            onClick={() => setIsPhoneLogin(true)}
                        >
                            Phone Login
                        </button>
                    </div>

                    {!isPhoneLogin ? (
                        <div className="form-group">
                            <input
                                className="input-field"
                                placeholder="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <input
                                className="input-field"
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button className="btn btn-primary" onClick={login}>
                                Sign In
                            </button>
                        </div>
                    ) : (
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
                                    disabled={!phoneNumber}
                                >
                                    Send OTP
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
                                        disabled={otp.length < 4}
                                    >
                                        Verify & Login
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
