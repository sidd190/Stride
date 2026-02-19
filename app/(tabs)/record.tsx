import React, { useEffect, useState, useRef } from 'react'
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { saveWorkout } from '@/services/api'

const __DEV__ = process.env.NODE_ENV === 'development'

export default function Record() {
  const { account } = useMobileWallet()
  const mapRef = useRef<MapView>(null)
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
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([])
  const [isTestMode, setIsTestMode] = useState(false)

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied')
        return
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: 1 })
      if (!location) return null
      setLocation(location)
    }

    getCurrentLocation()
  }, [])

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

            const newCoord = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            }

            // Add to route coordinates
            setRouteCoordinates((prev) => [...prev, newCoord])

            if (lastPosition) {
              const distanceDelta = calculateDistance(
                lastPosition.latitude,
                lastPosition.longitude,
                newCoord.latitude,
                newCoord.longitude,
              )
              setDistance((prev) => prev + distanceDelta)
            }

            setLastPosition(newCoord)
          },
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

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  let text = 'Waiting...'
  if (errorMsg) {
    text = errorMsg
  } else if (location) {
    text = JSON.stringify(location)
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
    setIsTestMode(false)
    setRouteCoordinates([])
    // Set initial position when starting
    if (location) {
      const initialCoord = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
      setLastPosition(initialCoord)
      setRouteCoordinates([initialCoord])
    }
  }

  // Test mode - simulate a workout
  const handleTestWorkout = () => {
    setIsTestMode(true)
    setWorkoutStarted(true)
    setWorkoutFinished(false)

    // Generate fake route (simulate 2km run in a loop)
    const startLat = location?.coords.latitude || 28.6139
    const startLng = location?.coords.longitude || 77.209

    const fakeRoute: { latitude: number; longitude: number }[] = []
    const numPoints = 80
    const radius = 0.01 // roughly 1km radius

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI
      const lat = startLat + radius * Math.cos(angle) + (Math.random() - 0.5) * 0.001
      const lng = startLng + radius * Math.sin(angle) + (Math.random() - 0.5) * 0.001
      fakeRoute.push({ latitude: lat, longitude: lng })
    }

    setRouteCoordinates(fakeRoute)

    // Calculate fake distance
    let totalDistance = 0
    for (let i = 1; i < fakeRoute.length; i++) {
      totalDistance += calculateDistance(
        fakeRoute[i - 1].latitude,
        fakeRoute[i - 1].longitude,
        fakeRoute[i].latitude,
        fakeRoute[i].longitude,
      )
    }

    setDistance(totalDistance)
    setTimer(720) // 12 minutes
    setWorkoutFinished(true)

    // Fit map to route
    setTimeout(() => {
      if (mapRef.current && fakeRoute.length > 0) {
        mapRef.current.fitToCoordinates(fakeRoute, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        })
      }
    }, 500)
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

    // Fit map to show full route
    if (mapRef.current && routeCoordinates.length > 1) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(routeCoordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        })
      }, 300)
    }
  }

  const handleReset = () => {
    setTimer(0)
    setRunning(false)
    setWorkoutStarted(false)
    setWorkoutFinished(false)
    setDistance(0)
    setLastPosition(null)
    setRouteCoordinates([])
    setIsTestMode(false)
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
        gpsCoordinates: routeCoordinates, // Send GPS coordinates for NFT
      }

      const result = await saveWorkout(workoutData)

      // Show success message with NFT info
      const nftMessage = result.workout.nftMinted 
        ? `\n\n NFT Minted!\nView on Explorer: ${result.workout.nftMintAddress?.slice(0, 8)}...`
        : '';

      Alert.alert(
        'Workout Saved!',
        `Great job! You earned ${result.workout.points} points!${nftMessage}\n\nDuration: ${formatTime(timer)}\nDistance: ${distanceKm.toFixed(2)} km`,
        [
          {
            text: 'OK',
            onPress: handleReset,
          },
        ],
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

        <View style={[styles.mapContainer, workoutFinished && styles.mapContainerLarge]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              longitude: location?.coords.longitude ?? 77.209,
              latitude: location?.coords.latitude ?? 28.6139,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={!workoutFinished}
            showsMyLocationButton={!workoutFinished}
          >
            {/* Draw the route */}
            {routeCoordinates.length > 1 && (
              <>
                {/* Shadow/border effect */}
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#611d72ff"
                  strokeWidth={8}
                  lineJoin="round"
                  lineCap="round"
                />
                {/* Main route line */}
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#8c00ffff"
                  strokeWidth={5}
                  lineJoin="round"
                  lineCap="round"
                />
              </>
            )}

            {/* Start marker */}
            {routeCoordinates.length > 0 && (
              <Marker coordinate={routeCoordinates[0]} title="Start" pinColor="#10b981" />
            )}

            {/* End marker */}
            {workoutFinished && routeCoordinates.length > 1 && (
              <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} title="Finish" pinColor="#ef4444" />
            )}
          </MapView>

          {/* Stats overlay on map when finished */}
          {workoutFinished && (
            <View style={styles.mapStatsOverlay}>
              <Text style={styles.mapStatsText}>
                {formatTime(timer)} • {(distance / 1000).toFixed(2)}km
              </Text>
            </View>
          )}
        </View>

        {!workoutStarted ? (
          <View style={styles.startContainer}>
            <Text style={styles.subtitle}>Ready to start your workout?</Text>
            <Text style={styles.description}>Track your activity and earn rewards</Text>
            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>

            {__DEV__ && (
              <TouchableOpacity style={styles.testButton} onPress={handleTestWorkout}>
                <Text style={styles.testButtonText}> Test Workout (Dev Only)</Text>
              </TouchableOpacity>
            )}
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
                  <Text style={styles.completeButtonText}>{saving ? 'Saving...' : 'Complete Workout'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resetButton} onPress={handleReset} disabled={saving}>
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
    backgroundColor: '#0a0a0a',
  },
  mapContainer: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  mapContainerLarge: {
    height: 400,
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
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
    color: '#ffffff',
  },
  description: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 40,
  },
  startContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#00ff88',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 16,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    color: '#0a0a0a',
    fontSize: 18,
    fontWeight: '800',
  },
  testButton: {
    marginTop: 15,
    backgroundColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  testButtonText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
  mapStatsOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapStatsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workoutContainer: {
    paddingBottom: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 30,
    padding: 30,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  timerLabel: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 10,
    fontWeight: '600',
  },
  timer: {
    fontSize: 56,
    fontWeight: '800',
    color: '#00ff88',
    fontVariant: ['tabular-nums'],
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#666666',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#ff9500',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pauseButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '800',
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#00ff88',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resumeButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '800',
  },
  finishButton: {
    flex: 1,
    backgroundColor: '#00d4ff',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  finishButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '800',
  },
  completeSection: {
    marginTop: 20,
  },
  completeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: '#ffffff',
  },
  summaryCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  summaryText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  completeButton: {
    backgroundColor: '#00ff88',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '800',
  },
  resetButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  resetButtonText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#ff4444',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 14,
  },
  success: {
    color: '#00ff88',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  mapStatsOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  mapStatsText: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: '800',
  },
})
