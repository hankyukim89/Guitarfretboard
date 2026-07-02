import React, { useState } from 'react';
import { X } from 'lucide-react';
import './AuthDialog.css';

const AuthDialog = ({ busy, message, onClose, onGoogle, onEmailSignIn, onCreateAccount }) => {
    const [mode, setMode] = useState('sign-in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        if (mode === 'create') onCreateAccount(email.trim(), password);
        else onEmailSignIn(email.trim(), password);
    };

    return (
        <div className="auth-overlay" onMouseDown={onClose}>
            <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={event => event.stopPropagation()}>
                <div className="auth-dialog-header">
                    <div>
                        <h2 id="auth-title">{mode === 'create' ? 'Create account' : 'Sign in'}</h2>
                        <p>Save and open your diagrams on any device.</p>
                    </div>
                    <button className="auth-close" onClick={onClose} aria-label="Close sign in">
                        <X size={18} />
                    </button>
                </div>

                <button className="auth-google-btn" onClick={onGoogle} disabled={busy}>
                    Continue with Google
                </button>

                <div className="auth-divider"><span>or use email</span></div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label>
                        <span>Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            autoComplete="email"
                            required
                        />
                    </label>
                    <label>
                        <span>Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                            minLength={6}
                            required
                        />
                    </label>

                    {message && <div className="auth-message" role="status">{message}</div>}

                    <button className="auth-submit" type="submit" disabled={busy}>
                        {busy ? 'Please wait…' : mode === 'create' ? 'Create account' : 'Sign in'}
                    </button>
                </form>

                <button className="auth-mode-switch" onClick={() => setMode(current => current === 'create' ? 'sign-in' : 'create')} disabled={busy}>
                    {mode === 'create' ? 'Already have an account? Sign in' : 'New here? Create an account'}
                </button>
            </section>
        </div>
    );
};

export default AuthDialog;
