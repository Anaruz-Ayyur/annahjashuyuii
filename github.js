const GitHubAPI = (function () {
  function apiBase() {
    const { owner, repo } = SITE_CONFIG;
    return `https://api.github.com/repos/${owner}/${repo}/contents`;
  }

  function authHeaders(token) {
    return {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    };
  }

  function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function base64ToUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
  }

  async function getFile(token, path) {
    const res = await fetch(`${apiBase()}/${path}?ref=${SITE_CONFIG.branch}`, {
      headers: authHeaders(token),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`تعذّر جلب ${path}: ${res.status}`);
    const data = await res.json();
    return { sha: data.sha, contentB64: data.content };
  }

  async function getJson(token, path) {
    const file = await getFile(token, path);
    if (!file) return { data: null, sha: null };
    return { data: JSON.parse(base64ToUtf8(file.contentB64)), sha: file.sha };
  }

  async function putFile(token, path, contentB64, message, sha) {
    const body = { message, content: contentB64, branch: SITE_CONFIG.branch };
    if (sha) body.sha = sha;
    const res = await fetch(`${apiBase()}/${path}`, {
      method: "PUT",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `فشل رفع ${path} (${res.status})`);
    }
    return res.json();
  }

  async function putJson(token, path, dataObj, message, sha) {
    return putFile(token, path, utf8ToBase64(JSON.stringify(dataObj, null, 2)), message, sha);
  }

  async function deleteFile(token, path, sha, message) {
    const res = await fetch(`${apiBase()}/${path}`, {
      method: "DELETE",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha, branch: SITE_CONFIG.branch }),
    });
    if (!res.ok && res.status !== 404) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `فشل حذف ${path} (${res.status})`);
    }
  }

  async function verifyAccess(token) {
    const { owner, repo } = SITE_CONFIG;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: authHeaders(token),
    });
    if (res.status === 401) throw new Error("رمز الدخول غير صالح");
    if (res.status === 404) throw new Error("تعذر الوصول إلى المستودع");
    if (!res.ok) throw new Error(`تعذر التحقق من الوصول (${res.status})`);
    return res.json();
  }

  return { getFile, getJson, putFile, putJson, deleteFile, verifyAccess, utf8ToBase64, base64ToUtf8 };
})();
