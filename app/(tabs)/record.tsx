import React, { useEffect, useState, useRef } from 'react'
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { saveWorkout } from '@/services/api'
import { colors, spacing, typography } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

const __DEV__ = process.env.NODE_ENV === 'development'

export default function Record() {
  const { account } = useMobileWallet()
  const mapRef = useRef<MapView>(null)
  const [timer, setTimer] = useState(0)
  const [running, setRunning] = useState(false)
  const [workoutStarted, setWorkoutStarted] = useState(false)
  const [workoutFinished, setWorkoutFinished] = useState(false)
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [distance, setDistance] = useState(0)
  const [lastPosition, setLastPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null)
  const [saving, setSaving] = useState(false)
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([])
  
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null)
  const lastPositionRef = useRef<{ latitude: number; longitude: number } | null>(null)
  const raceStartTime = useRef<number>(0)
  const distanceAccumulator = useRef<number>(0)

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return

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

            setRouteCoordinates((prev) => [...prev, newCoord])

            if (lastPositionRef.current) {
              const distanceDelta = calculateDistance(
                lastPositionRef.current.latitude,
                lastPositionRef.current.longitude,
                newCoord.latitude,
                newCoord.longitude,
              )
              distanceAccumulator.current += distanceDelta
              setDistance(distanceAccumulator.current)
            }

            lastPositionRef.current = newCoord
          },
        )
        locationSubscriptionRef.current = subscription
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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
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
    setRouteCoordinates([])
    raceStartTime.current = Date.now()
    distanceAccumulator.current = 0
    
    if (location) {
      const initialCoord = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
      lastPositionRef.current = initialCoord
      setRouteCoordinates([initialCoord])
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
    
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove()
      locationSubscriptionRef.current = null
    }

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
    lastPositionRef.current = null
    setRouteCoordinates([])
    distanceAccumulator.current = 0
    
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove()
      locationSubscriptionRef.current = null
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
        gpsCoordinates: routeCoordinates,
      }

      const result = await saveWorkout(workoutData)

      const nftMessage = result.workout.nftMinted 
        ? `\n\nNFT minted: ${result.workout.nftMintAddress?.slice(0, 8)}...`
        : '';

      Alert.alert(
        'Workout Saved',
        `${result.workout.points} points earned${nftMessage}`,
        [{ text: 'OK', onPress: handleReset }],
      )
    } catch (error: any) {
      Alert.alert('Save Failed', error.message || 'Failed to save workout')
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RECORD</Text>
        </View>

        {/* Map */}
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
            showsMyLocationButton={false}
          >
            {routeCoordinates.length > 1 && (
              <>
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={colors.primary[500]}
                  strokeWidth={4}
                  lineJoin="round"
                  lineCap="round"
                />
              </>
            )}

            {routeCoordinates.length > 0 && (
              <Marker coordinate={routeCoordinates[0]} pinColor={colors.secondary[500]} />
            )}

            {workoutFinished && routeCoordinates.length > 1 && (
              <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} pinColor={colors.error} />
            )}
          </MapView>
        </View>

        {!workoutStarted ? (
          <View style={styles.startContainer}>
            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Ionicons name="play" size={32} color={colors.background.primary} />
            </TouchableOpacity>
            <Text style={styles.startLabel}>START</Text>
          </View>
        ) : (
          <View style={styles.workoutContainer}>
            {/* Timer */}
            <View style={styles.timerContainer}>
              <Text style={styles.timer}>{formatTime(timer)}</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>DISTANCE</Text>
                <Text style={styles.statValue}>{(distance / 1000).toFixed(2)}</Text>
                <Text style={styles.statUnit}>km</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>PACE</Text>
                <Text style={styles.statValue}>{calculatePace()}</Text>
                <Text style={styles.statUnit}>min/km</Text>
              </View>
            </View>

            {/* Controls */}
            {!workoutFinished && (
              <View style={styles.controls}>
                {running ? (
                  <TouchableOpacity style={styles.controlButton} onPress={handlePause}>
                    <Ionicons name="pause" size={24} color={colors.text.primary} />
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={styles.controlButton} onPress={handleResume}>
                      <Ionicons name="play" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlButton} onPress={handleFinish}>
                      <Ionicons name="stop" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Complete */}
            {workoutFinished && (
              <View style={styles.completeSection}>
                <TouchableOpacity
                  style={[styles.completeButton, saving && styles.buttonDisabled]}
                  onPress={handleCompleteWorkout}
                  disabled={saving}
                >
                  <Text style={styles.completeButtonText}>{saving ? 'SAVING' : 'COMPLETE'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.discardButton} onPress={handleReset} disabled={saving}>
                  <Text style={styles.discardButtonText}>DISCARD</Text>
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
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    letterSpacing: 2,
    fontWeight: '300',
  },
  mapContainer: {
    width: '100%',
    height: 300,
    backgroundColor: colors.background.secondary,
  },
  mapContainerLarge: {
    height: 400,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  startButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  startLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
  workoutContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  timer: {
    fontSize: 64,
    fontWeight: '200',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border.subtle,
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 1.5,
  },
  statValue: {
    ...typography.h1,
    color: colors.text.primary,
    fontWeight: '300',
    marginBottom: spacing.xs,
  },
  statUnit: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeSection: {
    gap: spacing.md,
  },
  completeButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
  },
  completeButtonText: {
    ...typography.label,
    color: colors.background.primary,
    letterSpacing: 2,
  },
  discardButton: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  discardButtonText: {
    ...typography.label,
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
