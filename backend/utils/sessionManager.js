import crypto, { randomUUID } from 'crypto';
import pool from '../db.js'

/**
 * Génère une empreinte d'appareil basée sur User-Agent + IP
 */
export const generateDeviceFingerprint = (req) => {
  const userAgent = req.headers['user-agent'] || 'unknown'
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  
  // Créer un hash du User-Agent + IP pour une empreinte cohérente
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${userAgent}:${ip}`)
    .digest('hex')
    .substring(0, 16)
  
  return fingerprint
}

/**
 * Créer une session pour une entreprise sur un appareil
 */
export const createSession = async (empresaId, deviceId, deviceName, token, expiresIn = '24h') => {
  try {
    const sessionId = randomUUID()
    
    // Parser l'expiration (ex: '24h' -> millisecondes)
    const expiresMs = expiresIn === '7d' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const expiresAt = new Date(Date.now() + expiresMs)
    
    // Hash du token pour sécurité
    const tokenHash = crypto.createHash('sha256').update(token + 'salt').digest('hex')
    
    // Supprimer les anciennes sessions du même device
    await pool.query(
      'DELETE FROM sessions WHERE entreprise_id = ? AND device_id = ?',
      [empresaId, deviceId]
    )
    
    // Créer la nouvelle session
    await pool.query(
      `INSERT INTO sessions (id, entreprise_id, device_id, device_name, token_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, empresaId, deviceId, deviceName, tokenHash, expiresAt]
    )
    
    console.log(`✅ [SESSION] Nouvelle session créée: ${empresaId} sur device ${deviceId}`)
    return sessionId
  } catch (err) {
    console.error('❌ [SESSION] Erreur création session:', err.message)
    throw err
  }
}

/**
 * Vérifier qu'une session est valide et met à jour last_activity
 */
export const verifySessionValidity = async (empresaId, deviceId) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, expires_at, last_activity FROM sessions 
       WHERE entreprise_id = ? AND device_id = ?`,
      [empresaId, deviceId]
    )
    
    if (rows.length === 0) {
      console.log(`⚠️ [SESSION] Session non trouvée: ${empresaId} device ${deviceId}`)
      return null
    }
    
    const session = rows[0]
    
    // Vérifier l'expiration
    if (new Date() > new Date(session.expires_at)) {
      console.log(`⚠️ [SESSION] Session expirée: ${empresaId}`)
      // Supprimer la session expirée
      await pool.query('DELETE FROM sessions WHERE id = ?', [session.id])
      return null
    }
    
    // Mettre à jour last_activity et prolonger l'expiration (Sliding Session)
    // On repousse de 24h à chaque activité pour rester connecté si utilisé
    const lastActivityTime = new Date(session.last_activity)
    const now = new Date()
    
    if (now - lastActivityTime > 60000) { // 1 minute entre deux MAJ max pour perf
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await pool.query(
        'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP, expires_at = ? WHERE id = ?',
        [newExpiresAt, session.id]
      )
    }
    
    return session;
  } catch (err) {
    console.error('❌ [SESSION] Erreur vérification session:', err.message)
    return null
  }
}

/**
 * Récupérer toutes les sessions actives d'une entreprise
 */
export const getActiveSessions = async (empresaId) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, device_id, device_name, last_activity, expires_at, created_at 
       FROM sessions 
       WHERE entreprise_id = ? AND expires_at > NOW()
       ORDER BY last_activity DESC`,
      [empresaId]
    )
    return rows
  } catch (err) {
    console.error('❌ [SESSION] Erreur récupération sessions:', err.message)
    return []
  }
}

/**
 * Déconnecter d'un appareil spécifique
 */
export const logoutDevice = async (empresaId, deviceId) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM sessions WHERE entreprise_id = ? AND device_id = ?',
      [empresaId, deviceId]
    )
    console.log(`✅ [SESSION] Déconnexion device: ${deviceId}`)
    return result.affectedRows > 0
  } catch (err) {
    console.error('❌ [SESSION] Erreur déconnexion:', err.message)
    return false
  }
}

/**
 * Déconnecter de tous les appareils
 */
export const logoutAllDevices = async (empresaId) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM sessions WHERE entreprise_id = ?',
      [empresaId]
    )
    console.log(`✅ [SESSION] Déconnexion tous appareils: ${empresaId}`)
    return result.affectedRows
  } catch (err) {
    console.error('❌ [SESSION] Erreur déconnexion globale:', err.message)
    return 0
  }
}
