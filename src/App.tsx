import { useState } from "react";
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

    const login = async () => {
        try {
            const res = await axios.post(
                "http://localhost:5000/api/auth/login",
                { email, password }
            );

            setAccessToken(res.data.accessToken);
            alert("Login successful");
        } catch (error: any) {
            alert(error.response?.data?.message || "Login failed");
        }
    };

    const sendOtp = async () => {
        try {
            await axios.post("http://localhost:5000/api/auth/send-otp", { phoneNumber });
            setOtpSent(true);
            alert(`OTP sent to ${phoneNumber} (Check backend console)`);
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to send OTP");
        }
    };

    const verifyOtp = async () => {
        try {
            const res = await axios.post("http://localhost:5000/api/auth/verify-otp", { phoneNumber, otp });
            setAccessToken(res.data.accessToken);
            alert("Phone Login successful");
        } catch (error: any) {
            alert(error.response?.data?.message || "Invalid OTP");
        }
    };

    const getSessions = async () => {
        try {
            const res = await axios.get(
                "http://localhost:5000/api/auth/sessions",
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            setSessions(res.data);
        } catch (error: any) {
            console.error(error);
            alert("Failed to fetch sessions");
        }
    };

    const revokeSession = async (id: string) => {
        try {
            await axios.delete(
                `http://localhost:5000/api/auth/sessions/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            getSessions();
        } catch (error) {
            console.error(error);
            alert("Failed to revoke session");
        }
    };

    const revokeAll = async () => {
        try {
            await axios.delete(
                "http://localhost:5000/api/auth/sessions",
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            getSessions();
        } catch (error) {
            console.error(error);
            alert("Failed to revoke all sessions");
        }
    };

    return (
        <div style={{ padding: 40, fontFamily: "Arial" }}>
            <h1>🔐 Auth Dashboard</h1>

            <div style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 10 }}>
                    <button
                        onClick={() => setIsPhoneLogin(false)}
                        style={{ fontWeight: !isPhoneLogin ? 'bold' : 'normal', marginRight: 10 }}
                    >
                        Email Login
                    </button>
                    <button
                        onClick={() => setIsPhoneLogin(true)}
                        style={{ fontWeight: isPhoneLogin ? 'bold' : 'normal' }}
                    >
                        Phone Login
                    </button>
                </div>

                {!isPhoneLogin ? (
                    <div>
                        <h3>Email Login</h3>
                        <input
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <br />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <br />
                        <button onClick={login} style={{ marginTop: 10 }}>Login</button>
                    </div>
                ) : (
                    <div>
                        <h3>Phone Login</h3>
                        <input
                            placeholder="Phone Number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                        <br />
                        {!otpSent ? (
                            <button onClick={sendOtp} style={{ marginTop: 10 }}>Send OTP</button>
                        ) : (
                            <div style={{ marginTop: 10 }}>
                                <input
                                    placeholder="Enter OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                                <br />
                                <button onClick={verifyOtp} style={{ marginTop: 10 }}>Verify OTP</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <hr />

            <button onClick={getSessions} disabled={!accessToken}>
                Load Sessions
            </button>

            <button
                onClick={revokeAll}
                disabled={!sessions.length}
                style={{ marginLeft: 10, background: "red", color: "white" }}
            >
                Logout All Devices
            </button>

            <div style={{ marginTop: 20 }}>
                {sessions.map((s) => (
                    <div
                        key={s.id}
                        style={{
                            border: "1px solid #ccc",
                            padding: 15,
                            marginBottom: 10,
                            borderRadius: 8,
                            background: s.revokedAt ? "#ffe6e6" : "#e6ffe6",
                        }}
                    >
                        <div><strong>User Agent:</strong> {s.userAgent}</div>
                        <div><strong>IP:</strong> {s.ip}</div>
                        <div>
                            <strong>Status:</strong>{" "}
                            {s.revokedAt ? "Revoked ❌" : "Active ✅"}
                        </div>
                        <div>
                            <strong>Created:</strong>{" "}
                            {new Date(s.createdAt).toLocaleString()}
                        </div>

                        {!s.revokedAt && (
                            <button
                                onClick={() => revokeSession(s.id)}
                                style={{
                                    marginTop: 10,
                                    background: "orange",
                                    border: "none",
                                    padding: "6px 12px",
                                    cursor: "pointer",
                                }}
                            >
                                Logout This Device
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
