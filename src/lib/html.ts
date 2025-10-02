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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }
    h1 { margin: 0 0 1rem 0; font-size: 2rem; }
    p { margin: 0.5rem 0; opacity: 0.9; }
    .status { margin-top: 1rem; font-size: 0.9rem; opacity: 0.7; }
    .success { color: #4ade80; }
    .code {
      background: rgba(0, 0, 0, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      margin-top: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>✓ Authentication Successful</h1>
    <p>You have been successfully signed in.</p>
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

