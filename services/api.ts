const BASE_URL = "http://192.168.1.8:3000";

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
