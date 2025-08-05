# Guia de Integração SSO - NeoLoc One

Este documento explica como integrar seus módulos externos ao sistema de Single Sign-On (SSO) do NeoLoc One.

## Como Funciona o SSO

1. Usuário clica em "Open" no dashboard do NeoLoc One
2. Sistema gera um token JWT temporário (válido por 5 minutos)
3. Módulo externo é aberto com URL: `http://seu-modulo.com?sso_token=TOKEN&user_id=USER_ID`
4. Módulo deve validar o token com a API do NeoLoc One
5. Se válido, módulo autentica o usuário automaticamente

## Implementação no Seu Módulo

### 1. Capturar Token da URL

```javascript
// JavaScript - Capturar parâmetros da URL
const urlParams = new URLSearchParams(window.location.search);
const ssoToken = urlParams.get('sso_token');
const userId = urlParams.get('user_id');

if (ssoToken && userId) {
    validateSSOToken(ssoToken, moduleId);
}
```

### 2. Validar Token com NeoLoc One

```javascript
// JavaScript - Validar token SSO
async function validateSSOToken(token, moduleId) {
    try {
        const response = await fetch('http://localhost:5000/api/sso/validate-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                moduleId: moduleId // ID do seu módulo no NeoLoc One
            })
        });

        if (response.ok) {
            const data = await response.json();
            // Token válido - dados do usuário em data.userData
            authenticateUser(data.userData);
        } else {
            // Token inválido - redirecionar para login
            redirectToLogin();
        }
    } catch (error) {
        console.error('Erro na validação SSO:', error);
        redirectToLogin();
    }
}

function authenticateUser(userData) {
    // Implementar autenticação no seu sistema
    console.log('Usuário autenticado:', userData);
    // userData contém: id, email, fullName, role, moduleAccess
    
    // Exemplo: salvar sessão local
    localStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('authenticated', 'true');
    
    // Redirecionar para página principal do módulo
    window.location.href = '/dashboard';
}

function redirectToLogin() {
    // Redirecionar para login local ou NeoLoc One
    window.location.href = '/login';
}
```

### 3. Exemplo em PHP

```php
<?php
// PHP - Validar token SSO
if (isset($_GET['sso_token']) && isset($_GET['user_id'])) {
    $token = $_GET['sso_token'];
    $userId = $_GET['user_id'];
    $moduleId = 'SEU_MODULE_ID'; // ID do módulo no NeoLoc One
    
    $userData = validateSSOToken($token, $moduleId);
    if ($userData) {
        // Autenticar usuário
        $_SESSION['user'] = $userData;
        header('Location: /dashboard.php');
        exit;
    } else {
        header('Location: /login.php');
        exit;
    }
}

function validateSSOToken($token, $moduleId) {
    $data = json_encode([
        'token' => $token,
        'moduleId' => $moduleId
    ]);
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => $data
        ]
    ]);
    
    $response = file_get_contents('http://localhost:5000/api/sso/validate-token', false, $context);
    
    if ($response) {
        $result = json_decode($response, true);
        return $result['valid'] ? $result['userData'] : null;
    }
    
    return null;
}
?>
```

### 4. Exemplo em Python (Flask/Django)

```python
import requests
from flask import Flask, request, session, redirect, url_for

def validate_sso_token(token, module_id):
    try:
        response = requests.post('http://localhost:5000/api/sso/validate-token', 
            json={
                'token': token,
                'moduleId': module_id
            })
        
        if response.status_code == 200:
            data = response.json()
            return data.get('userData') if data.get('valid') else None
    except Exception as e:
        print(f"Erro na validação SSO: {e}")
    
    return None

@app.route('/')
def index():
    sso_token = request.args.get('sso_token')
    user_id = request.args.get('user_id')
    
    if sso_token and user_id:
        user_data = validate_sso_token(sso_token, 'SEU_MODULE_ID')
        if user_data:
            session['user'] = user_data
            return redirect(url_for('dashboard'))
    
    return redirect(url_for('login'))
```

## Configuração no NeoLoc One

1. Acesse **Admin > Module Management**
2. Edite seu módulo
3. Configure a **URL** para o endereço do seu módulo
4. Anote o **Module ID** para usar na validação

## Dados do Usuário Disponíveis

Após validação bem-sucedida, você recebe:

```json
{
  "id": "user-uuid",
  "email": "usuario@empresa.com",
  "fullName": "Nome do Usuário",
  "role": "administrator|manager|operator|viewer",
  "moduleAccess": ["module1", "module2"]
}
```

## Segurança

- Tokens expiram em 5 minutos
- Tokens são de uso único (marcados como utilizados após validação)
- Sempre valide tokens no servidor, nunca no client-side apenas
- Use HTTPS em produção

## Troubleshooting

1. **Página em branco**: Módulo não está implementando validação SSO
2. **Token inválido**: Verificar se moduleId está correto
3. **Erro de CORS**: Configurar CORS no NeoLoc One se necessário
4. **URL incorreta**: Verificar URL do módulo no Module Management

## Exemplo Completo

Vou criar um módulo de exemplo que demonstra a integração completa.