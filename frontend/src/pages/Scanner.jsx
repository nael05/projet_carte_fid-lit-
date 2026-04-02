import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const Scanner = () => {
    const [scanResult, setScanResult] = useState(null);
    const [points, setPoints] = useState(1);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        scanner.render(
            (decodedText) => {
                setScanResult(decodedText);
                scanner.clear();
            },
            (error) => {
            }
        );

        return () => {
            scanner.clear().catch(error => {
            });
        };
    }, []);

    const handleAddPoints = async () => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch('http://localhost:3000/api/scan/add-points', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ clientId: scanResult, points: parseInt(points) })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Points ajoutés avec succès !');
                setTimeout(() => {
                    setScanResult(null);
                    setMessage('');
                    window.location.reload();
                }, 2000);
            } else {
                setMessage(data.error || 'Erreur lors de l\'ajout des points');
            }
        } catch (error) {
            setMessage('Erreur de connexion au serveur');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            <h2>Scanner de Carte de Fidélité</h2>
            
            {!scanResult ? (
                <div id="reader" style={{ width: '300px', marginTop: '20px' }}></div>
            ) : (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ color: 'green', fontWeight: 'bold' }}>Client identifié !</p>
                    
                    <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label>Points à ajouter :</label>
                        <input 
                            type="number" 
                            min="1" 
                            value={points} 
                            onChange={(e) => setPoints(e.target.value)}
                            style={{ width: '60px', padding: '5px' }}
                        />
                    </div>

                    <button 
                        onClick={handleAddPoints}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#007BFF',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Valider l'ajout
                    </button>

                    {message && <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{message}</p>}
                </div>
            )}
        </div>
    );
};

export default Scanner;