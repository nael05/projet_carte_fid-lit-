import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Scanner from './pages/Scanner';
import CreationCarte from './pages/CreationCarte';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/join/:entrepriseId" element={<CreationCarte />} />
                <Route 
                    path="/scanner" 
                    element={
                        <PrivateRoute>
                            <Scanner />
                        </PrivateRoute>
                    } 
                />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
};

export default App;