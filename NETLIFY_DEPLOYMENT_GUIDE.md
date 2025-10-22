# 🚀 Guide de déploiement Netlify

## 🔍 Problème identifié

Votre projet fonctionne localement mais pas sur Netlify car **les variables d'environnement ne sont pas correctement configurées** sur Netlify.

## ⚡ Solution immédiate

### Étape 1 : Configuration des variables d'environnement sur Netlify

1. **Ouvrez votre dashboard Netlify** :
   - Allez sur : https://app.netlify.com/sites/ticketyx/settings/env-vars

2. **Ajoutez cette variable** :
   ```
   Clé : BASEROW_API_TOKEN
   Valeur : votre_token_baserow_reel
   ```

3. **Redéployez votre site** :
   - Allez dans "Deploys" dans votre dashboard Netlify
   - Cliquez sur "Trigger deploy" > "Deploy site"

### Étape 2 : Vérification

Après redéploiement, testez :
- https://ticketyx.netlify.app/test-api.html
- Ouvrez la console développeur (F12)
- Vous devriez voir : "✅ API Token: Configuré"

## 📋 Configuration complète recommandée

Ajoutez aussi ces variables dans Netlify :

```bash
NODE_ENV=production
DEBUG_MODE=false
```

## 🔧 Fichiers créés pour Netlify

### `netlify.toml` - Configuration Netlify
- Sécurité headers
- Configuration de build
- Gestion des redirections

### Modifications apportées

#### `js/config.js` - Détection automatique Netlify
```javascript
// Netlify Environment Variables Check
if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const isNetlify = window.location.hostname.includes('netlify');
    if (isNetlify && (!BASEROW_API_TOKEN || BASEROW_API_TOKEN === 'YOUR_API_TOKEN_HERE')) {
        console.error('🔴 NETLIFY ERROR: BASEROW_API_TOKEN not configured in Netlify dashboard!');
        console.error('📋 Go to: https://app.netlify.com/sites/ticketyx/settings/env-vars');
        console.error('➕ Add: BASEROW_API_TOKEN = your_actual_token');
    }
}
```

## 🧪 Tests à effectuer après configuration

### 1. Test de configuration
- Allez sur : https://ticketyx.netlify.app/test-api.html
- Cliquez sur "1️⃣ Tester la configuration"
- Devrait afficher : "✅ API Token: Configuré"

### 2. Test de connexion API
- Même page, cliquez sur "2️⃣ Tester la connexion basique"
- Devrait réussir si le token est correct

### 3. Test complet
- Testez la connexion utilisateur avec de vraies données

## 🚨 Messages d'erreur courants

### Si vous voyez dans la console :
```
🔴 NETLIFY ERROR: BASEROW_API_TOKEN not configured in Netlify dashboard!
```

**Solution** : La variable n'est pas configurée dans Netlify. Refaites l'étape 1.

### Si l'API ne répond pas :
1. Vérifiez que votre token Baserow est valide
2. Vérifiez que vos tables existent et sont accessibles
3. Vérifiez les permissions de votre token

## 📞 Support

Si le problème persiste après configuration :

1. **Vérifiez la console du navigateur** (F12 > Console)
2. **Vérifiez le réseau** (F12 > Network)
3. **Partagez les erreurs** avec votre token de support

## 🎯 Résumé des actions

✅ **FAIT** : Code sécurisé pour Netlify
✅ **FAIT** : Configuration netlify.toml
⏳ **À FAIRE** : Ajouter BASEROW_API_TOKEN dans Netlify
⏳ **À FAIRE** : Redéployer le site
⏳ **À FAIRE** : Tester la connexion

Suivez ces étapes et votre application fonctionnera parfaitement sur Netlify !
