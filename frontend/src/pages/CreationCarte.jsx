import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const CreationCarte = () => {
    const { entrepriseId } = useParams();
    const [branding, setBranding] = useState(null);
    const [formData, setFormData] = useState({ prenom: '', email: '' });
    const [carteCreee, setCarteCreee] = useState(false);
    const [clientId, setClientId] = useState(null);

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const response = await fetch(`http://localhost:3000/api/entreprise/branding/${entrepriseId}`);
                if (response.ok) {
                    const data = await response.json();
                    setBranding(data);
                }
            } catch (error) {
            }
        };
        fetchBranding();
    }, [entrepriseId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:3000/api/clients/public/${entrepriseId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const data = await response.json();
                setClientId(data.id);
                setCarteCreee(true);
            }
        } catch (error) {
        }
    };

    if (!branding) return <div>Chargement...</div>;

    if (carteCreee) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px' }}>
                <h2 style={{ color: branding.couleur_principale }}>Félicitations {formData.prenom} !</h2>
                <a 
                    href={`http://localhost:3000/api/pass/apple/${clientId}`}
                    style={{
                        display: 'inline-block',
                        marginTop: '20px',
                        padding: '15px 30px',
                        backgroundColor: '#000',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                    }}
                >
                    Ajouter à Apple Wallet
                </a>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px' }}>
            {branding.url_logo && (
                <img src={branding.url_logo} alt={branding.nom} style={{ width: '150px', marginBottom: '20px' }} />
            )}
            
            <h1 style={{ color: branding.couleur_principale }}>
                Rejoignez {branding.nom}
            </h1>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px', width: '300px' }}>
                <input 
                    type="text" 
                    placeholder="Votre prénom" 
                    required 
                    value={formData.prenom}
                    onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
                />
                <input 
                    type="email" 
                    placeholder="Votre email" 
                    required 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
                />
                
                <button 
                    type="submit" 
                    style={{ 
                        backgroundColor: branding.couleur_principale, 
                        color: '#ffffff', 
                        padding: '12px', 
                        border: 'none', 
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Générer ma carte
                </button>
            </form>
        </div>
    );
};

export default CreationCarte;