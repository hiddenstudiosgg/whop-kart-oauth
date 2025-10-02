/**
 * Generate loopback HTML page for Unity OAuth flow
 * This page optionally POSTs the session back to Unity's local HTTP listener
 */
export function generateLoopbackHTML(sessionData: any, port?: string): string {
  const sessionJSON = JSON.stringify(sessionData);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #0a0a0a;
      color: #ffffff;
    }
    .container {
      text-align: center;
      padding: 3rem 2rem;
      background: #111111;
      border-radius: 12px;
      border: 1px solid #222222;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
      max-width: 500px;
      width: 90%;
    }
    .logo {
      width: 48px;
      height: 48px;
      margin: 0 auto 1.5rem;
      background: #7c3aed;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    h1 { 
      margin: 0 0 0.5rem 0; 
      font-size: 1.75rem;
      font-weight: 600;
      color: #ffffff;
    }
    p { 
      margin: 0.5rem 0; 
      color: #888888;
      font-size: 0.95rem;
    }
    .status { 
      margin-top: 1.5rem; 
      padding: 1rem;
      background: #1a1a1a;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #aaaaaa;
    }
    .success { 
      color: #22c55e;
      font-weight: 500;
    }
    .code {
      background: #1a1a1a;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
      font-size: 0.8rem;
      word-break: break-all;
      color: #7c3aed;
      border: 1px solid #222222;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">✓</div>
    <h1>Authentication Successful</h1>
    <p>You have been successfully signed in with Whop.</p>
    <p class="status" id="status">Initializing...</p>
    ${port ? '' : '<div class="code" id="token"></div>'}
  </div>
  
  <script>
    const sessionData = ${sessionJSON};
    const port = ${port ? `"${port}"` : 'null'};
    const statusEl = document.getElementById('status');
    
    if (port) {
      // Loopback mode: POST session to Unity's local listener
      statusEl.textContent = 'Sending session to Unity...';
      
      fetch(\`http://127.0.0.1:\${port}/session\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      })
      .then(response => {
        if (response.ok) {
          statusEl.innerHTML = '<span class="success">Session sent to Unity! You can close this tab.</span>';
        } else {
          statusEl.textContent = 'Failed to send session to Unity. Please copy the token manually.';
          showToken();
        }
      })
      .catch(err => {
        console.error('Loopback error:', err);
        statusEl.textContent = 'Could not reach Unity listener. Please copy the token manually.';
        showToken();
      });
    } else {
      // Direct mode: Display token for manual copy
      statusEl.innerHTML = '<span class="success">You can close this tab or copy the token below:</span>';
      showToken();
    }
    
    function showToken() {
      const tokenEl = document.getElementById('token');
      if (tokenEl) {
        tokenEl.textContent = sessionData.session_token;
      }
    }
  </script>
</body>
</html>`;
}

