# 🔒 Guide de déploiement sécurisé

## 🚨 IMPORTANT : Actions de sécurité immédiates

### ✅ Corrections déjà appliquées

1. **Suppression des boutons de test dangereux** - Les comptes de test avec mots de passe en clair ont été supprimés de `login.html`
2. **Sécurisation de la clé API** - Le token n'est plus en dur dans le code client
3. **Configuration serveur sécurisée** - Le serveur injecte maintenant le token de manière sécurisée

### ⚠️ Actions à effectuer avant déploiement

## 1. Configuration de la clé API sécurisée

### Étape 1 : Obtenir votre token Baserow
1. Connectez-vous à votre compte Baserow
2. Allez dans **Settings > API Tokens**
3. Créez un nouveau token ou utilisez un token existant
4. **Notez précieusement ce token** (il ne sera affiché qu'une seule fois)

### Étape 2 : Configuration locale pour développement

**Option A : Variable d'environnement permanente**
```bash
# Ajouter dans votre ~/.bashrc ou ~/.zshrc
echo 'export BASEROW_API_TOKEN="votre_token_ici"' >> ~/.bashrc
source ~/.bashrc
```

**Option B : Démarrage manuel**
```bash
# Démarrer le serveur avec le token
BASEROW_API_TOKEN=votre_token_ici python3 serve.py
```

**Option C : Fichier d'environnement**
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env (ne pas commiter .env !)
# Ajouter votre vrai token dans BASEROW_API_TOKEN=
```

## 2. Vérification de la sécurité

### Test de la configuration sécurisée
1. Démarrer le serveur avec votre token configuré
2. Ouvrir http://localhost:8000/test-api.html
3. Cliquer sur "1️⃣ Tester la configuration"
4. Vérifier que tous les éléments sont ✅

### Vérification manuelle
- Ouvrir les outils développeur du navigateur (F12)
- Aller dans l'onglet Network
- Recharger la page
- Vérifier qu'aucun token API n'apparaît dans le code source

## 3. Déploiement en production

### Configuration serveur recommandée

**Variables d'environnement serveur :**
```bash
export BASEROW_API_TOKEN="votre_token_production"
export NODE_ENV="production"
export DEBUG_MODE=false
```

**Configuration CORS restrictive :**
Dans `serve.py`, remplacer :
```python
self.send_header('Access-Control-Allow-Origin', '*')
```
par :
```python
self.send_header('Access-Control-Allow-Origin', 'https://votredomaine.com')
```

**Serveur web recommandé :**
- Utiliser Nginx + Gunicorn pour Python
- Configurer HTTPS obligatoire
- Activer les headers de sécurité

## 4. Bonnes pratiques de sécurité

### ✅ À faire
- [ ] Utiliser HTTPS en production
- [ ] Configurer CORS restrictif
- [ ] Mettre à jour les dépendances régulièrement
- [ ] Surveiller les logs d'accès
- [ ] Sauvegarder la base de données régulièrement

### ❌ À éviter
- [ ] Ne pas commiter le fichier `.env`
- [ ] Ne pas exposer les tokens dans le code client
- [ ] Ne pas utiliser les comptes de test en production
- [ ] Ne pas désactiver les contrôles d'accès

## 5. Surveillance et maintenance

### Logs à surveiller
- Erreurs d'authentification
- Tentatives d'accès non autorisé
- Requêtes API échouées
- Utilisation inhabituelle

### Maintenance régulière
- Rotation des tokens API
- Mise à jour des dépendances
- Révision des permissions utilisateurs
- Tests de sécurité périodiques

## 🚨 En cas d'incident de sécurité

1. **Révoquer immédiatement** le token API compromise
2. **Générer un nouveau token**
3. **Mettre à jour** toutes les configurations
4. **Vérifier** les logs pour détecter l'intrusion
5. **Changer** tous les mots de passe utilisateurs si nécessaire

## 📞 Support

En cas de problème de sécurité :
1. Révoquer le token immédiatement
2. Contacter l'administrateur système
3. Vérifier l'intégrité du serveur
4. Analyser les logs d'accès

---

**Rappel** : La sécurité est un processus continu, pas une destination. Restez vigilant et mettez à jour régulièrement vos pratiques de sécurité.
