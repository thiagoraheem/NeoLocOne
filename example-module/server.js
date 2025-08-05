// Servidor de exemplo para demonstrar integração SSO
// Execute com: node server.js

const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Middleware
app.use(express.static('.'));
app.use(express.json());

// CORS para permitir requisições do NeoLoc One
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API de exemplo para demonstrar que o módulo está funcionando
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        module: 'Exemplo SSO',
        timestamp: new Date().toISOString(),
        message: 'Módulo funcionando corretamente com integração SSO'
    });
});

// Simular validação local de token (opcional)
app.post('/api/validate-local-session', (req, res) => {
    const { userId, sessionData } = req.body;
    
    // Em um sistema real, você validaria a sessão no seu banco de dados
    res.json({
        valid: true,
        user: sessionData,
        message: 'Sessão local válida'
    });
});

app.listen(PORT, () => {
    console.log(`
🚀 Módulo de Exemplo SSO rodando!
📍 URL: http://localhost:${PORT}
🔗 Para testar o SSO, configure este URL no NeoLoc One:
   - Acesse Admin > Module Management
   - Edite um módulo existente ou crie um novo
   - Configure URL: http://localhost:${PORT}
   - Salve e teste clicando em "Open" no dashboard
    `);
});