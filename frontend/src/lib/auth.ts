export const syncGoogleAuth = async (idToken: string) => {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('Backend URL is not configured. Please check your environment variables.');
    }

    const response = await fetch(`${backendUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      if (data.token) {
        localStorage.setItem('token', data.token);
        return data;
      } else {
        throw new Error(data.message || 'No token received from backend');
      }
    } else {
      throw new Error(data.message || data.error || 'Backend Google auth sync failed');
    }
  } catch (error) {
    console.error('Backend Google auth sync error:', error);
    throw new Error(error.message || 'Server error, try again later');
  }
};

export const logOut = async (): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    localStorage.removeItem('token');
    return;
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    await fetch(`${backendUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
  } catch (error) {
    console.error('Logout API failed:', error);
  } finally {
    localStorage.removeItem('token');
  }
};

export const signUpWithEmail = async (email: string, password: string, name: string) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetch(`${backendUrl}/auth/signup`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Signup failed');
  }

  return data;
};

export const loginWithEmail = async (email: string, password: string) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (!backendUrl) {
    throw new Error('Backend URL is not configured');
  }

  const response = await fetch(`${backendUrl}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Login failed');
  }

  if (data.token) {
    localStorage.setItem('token', data.token);
  } else {
    throw new Error('No token received from backend');
  }

  return data;
};
