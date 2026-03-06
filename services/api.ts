import { Platform } from 'react-native'

const BASE_URL = 'https://stride-8mcq.onrender.com'

export async function verifyWallet(payload: any) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API Error: ${res.status} - ${text}`);
    }

    return res.json();
  } catch (error) {
    console.error("verifyWallet error:", error);
    throw error;
  }
}

export async function getProfile(wallet: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/profile/${wallet}`);
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API Error: ${res.status} - ${text}`);
    }

    return res.json();
  } catch (error) {
    console.error("getProfile error:", error);
    throw error;
  }
}

export async function createProfile(data: any) {
  try {
    const res = await fetch(`${BASE_URL}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API Error: ${res.status} - ${text}`);
    }

    return res.json();
  } catch (error) {
    console.error("createProfile error:", error);
    throw error;
  }
}

export async function deleteProfile(wallet: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/profile/${wallet}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API Error: ${res.status} - ${text}`);
    }

    return res.json();
  } catch (error) {
    console.error("deleteProfile error:", error);
    throw error;
  }
}

export async function saveWorkout(data: {
  wallet: string;
  duration: number;
  distance: number;
}) {
  try {
    const res = await fetch(`${BASE_URL}/api/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to save workout");
    }

    return res.json();
  } catch (error) {
    console.error("saveWorkout error:", error);
    throw error;
  }
}

export async function getWorkoutHistory(wallet: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/workouts/${wallet}`);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API Error: ${res.status} - ${text}`);
    }

    return res.json();
  } catch (error) {
    console.error("getWorkoutHistory error:", error);
    throw error;
  }
}

export async function getLeagues() {
  try {
    const url = `${BASE_URL}/api/leagues`
    console.log('Fetching leagues from:', url)
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch leagues');
    return res.json();
  } catch (error) {
    console.error('getLeagues error:', error);
    throw error;
  }
}

export async function getUserLeagues(wallet: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/leagues/user/${wallet}`);
    if (!res.ok) throw new Error('Failed to fetch user leagues');
    return res.json();
  } catch (error) {
    console.error('getUserLeagues error:', error);
    throw error;
  }
}

export async function getLeaderboard(leagueId: number) {
  try {
    const res = await fetch(`${BASE_URL}/api/leagues/${leagueId}/leaderboard`);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  } catch (error) {
    console.error('getLeaderboard error:', error);
    throw error;
  }
}

export async function joinLeague(wallet: string, leagueId: number) {
  try {
    const res = await fetch(`${BASE_URL}/api/leagues/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, leagueId }),
    });
    if (!res.ok) throw new Error('Failed to join league');
    return res.json();
  } catch (error) {
    console.error('joinLeague error:', error);
    throw error;
  }
}

export async function leaveLeague(wallet: string, leagueId: number) {
  try {
    const res = await fetch(`${BASE_URL}/api/leagues/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, leagueId }),
    });
    if (!res.ok) throw new Error('Failed to leave league');
    return res.json();
  } catch (error) {
    console.error('leaveLeague error:', error);
    throw error;
  }
}

export async function getRaceHistory(wallet: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/races/history/${wallet}`);
    if (!res.ok) throw new Error('Failed to fetch race history');
    return res.json();
  } catch (error) {
    console.error('getRaceHistory error:', error);
    throw error;
  }
}

