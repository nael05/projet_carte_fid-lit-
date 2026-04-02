import React, { useState } from 'react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [motDePasse, setMotDePasse] = useState('');
    const [erreur, setErreur] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setErreur('');

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, mot_de_passe: motDePasse })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                window.location.href = '/scanner'; 
            } else {
                setErreur(data.error || 'Erreur de connexion');
            }
        } catch (error) {
            setErreur('Erreur serveur');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px' }}>
            <h2>Connexion Espace Commerçant</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px', marginTop: '20px' }}>
                <input 
                    type="email" 
                    placeholder="Email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
                <input 
                    type="password" 
                    placeholder="Mot de passe" 
                    required 
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
                {erreur && <p style={{ color: 'red', fontSize: '14px', margin: '0' }}>{erreur}</p>}
                <button 
                    type="submit"
                    style={{ 
                        padding: '10px', 
                        backgroundColor: '#000', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Se connecter
                </button>
            </form>
        </div>
    );
};

export default Login;