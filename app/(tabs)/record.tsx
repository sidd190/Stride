import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { saveWorkout } from '@/services/api'

export default function Record() {
  const { account } = useMobileWallet()
  const [timer, setTimer] = useState(0)
  const [running, setRunning] = useState(false)
  const [workoutStarted, setWorkoutStarted] = useState(false)
  const [workoutFinished, setWorkoutFinished] = useState(false)
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [distance, setDistance] = useState(0) // in meters
  const [lastPosition, setLastPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(()=>{
    async function getCurrentLocation(){
      let {status} = await Location.requestForegroundPermissionsAsync();
      if(status !== 'granted'){
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({accuracy:1});
      if(!location) return null;
      setLocation(location);
    }

    getCurrentLocation();
  },[]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (running) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval)
      }
    }
  }, [running])

  // Start/stop location tracking based on running state
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null

    const startTracking = async () => {
      if (running && workoutStarted) {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (newLocation) => {
            setLocation(newLocation)

            if (lastPosition) {
              const distanceDelta = calculateDistance(
                lastPosition.latitude,
                lastPosition.longitude,
                newLocation.coords.latitude,
                newLocation.coords.longitude
              )
              setDistance((prev) => prev + distanceDelta)
            }

            setLastPosition({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            })
          }
        )
        setLocationSubscription(subscription)
      }
    }

    if (running && workoutStarted) {
      startTracking()
    }

    return () => {
      if (subscription) {
        subscription.remove()
      }
    }
  }, [running, workoutStarted])

  // Crazy Haversine formula for calculating distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  let text = 'Waiting...';
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    setWorkoutStarted(true)
    setRunning(true)
    setWorkoutFinished(false)
    // Set initial position when starting
    if (location) {
      setLastPosition({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
    }
  }

  const handlePause = () => {
    setRunning(false)
  }

  const handleResume = () => {
    setRunning(true)
  }

  const handleFinish = () => {
    setRunning(false)
    setWorkoutFinished(true)
    // Stop location tracking
    if (locationSubscription) {
      locationSubscription.remove()
      setLocationSubscription(null)
    }
  }

  const handleReset = () => {
    setTimer(0)
    setRunning(false)
    setWorkoutStarted(false)
    setWorkoutFinished(false)
    setDistance(0)
    setLastPosition(null)
    if (locationSubscription) {
      locationSubscription.remove()
      setLocationSubscription(null)
    }
  }

  const handleCompleteWorkout = async () => {
    if (!account) {
      Alert.alert('Error', 'Wallet not connected')
      return
    }

    const distanceKm = distance / 1000

    try {
      setSaving(true)

      const workoutData = {
        wallet: account.address.toString(),
        duration: timer,
        distance: distanceKm,
      }

      const result = await saveWorkout(workoutData)

      Alert.alert(
        'Workout Saved!',
        `Great job! You earned ${result.workout.points} points!\n\nDuration: ${formatTime(timer)}\nDistance: ${distanceKm.toFixed(2)} km`,
        [
          {
            text: 'OK',
            onPress: handleReset,
          },
        ]
      )
    } catch (error: any) {
      console.error('Failed to save workout:', error)
      
      // Show specific error message from backend
      const errorMessage = error.message || 'Failed to save workout. Please try again.'
      
      Alert.alert('Save Failed', errorMessage, [{ text: 'OK' }])
    } finally {
      setSaving(false)
    }
  }

  const calculatePace = (): string => {
    if (distance === 0) return '--:--'
    const km = distance / 1000
    const minutes = timer / 60
    const pace = minutes / km
    const paceMin = Math.floor(pace)
    const paceSec = Math.floor((pace - paceMin) * 60)
    return `${paceMin}:${paceSec.toString().padStart(2, '0')}`
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <Text style={styles.title}>Track Workout</Text>
        
        <View style={styles.mapContainer}>
          <MapView 
            style={styles.map} 
            provider={PROVIDER_GOOGLE} 
            initialRegion={{
              longitude: location?.coords.longitude ?? 77.2090,
              latitude: location?.coords.latitude ?? 28.6139,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {location && (
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title="Your Location"
                description="You are here"
                pinColor="#10b981"
              />
            )}
          </MapView>
        </View>

        {!workoutStarted ? (
          <View style={styles.startContainer}>
            <Text style={styles.subtitle}>Ready to start your workout?</Text>
            <Text style={styles.description}>Track your activity and earn rewards</Text>
            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.workoutContainer}>
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Duration</Text>
              <Text style={styles.timer}>{formatTime(timer)}</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{(distance / 1000).toFixed(2)} km</Text>
                <Text style={styles.statSubtext}>Total distance</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Pace</Text>
                <Text style={styles.statValue}>{calculatePace()}</Text>
                <Text style={styles.statSubtext}>min/km</Text>
              </View>
            </View>

            {!workoutFinished && (
              <View style={styles.controls}>
                {running ? (
                  <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
                    <Text style={styles.pauseButtonText}>Pause Workout</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
                      <Text style={styles.resumeButtonText}>Resume</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                      <Text style={styles.finishButtonText}>Finish</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {workoutFinished && (
              <View style={styles.completeSection}>
                <Text style={styles.completeSectionTitle}>Workout Summary</Text>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryText}>Duration: {formatTime(timer)}</Text>
                  <Text style={styles.summaryText}>Distance: {(distance / 1000).toFixed(2)} km</Text>
                  <Text style={styles.summaryText}>Pace: {calculatePace()} min/km</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.completeButton, saving && styles.buttonDisabled]} 
                  onPress={handleCompleteWorkout}
                  disabled={saving}
                >
                  <Text style={styles.completeButtonText}>
                    {saving ? 'Saving...' : 'Complete Workout'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.resetButton} 
                  onPress={handleReset}
                  disabled={saving}
                >
                  <Text style={styles.resetButtonText}>Discard</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
    color: '#111827',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  startContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#10b981',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  workoutContainer: {
    paddingBottom: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 30,
    padding: 30,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  timerLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 10,
    fontWeight: '600',
  },
  timer: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  finishButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeSection: {
    marginTop: 20,
  },
  completeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#f3f4f6',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  completeButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 14,
  },
  success: {
    color: '#16a34a',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
