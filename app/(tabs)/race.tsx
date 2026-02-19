import React, { useState, useEffect, useRef } from 'react'
import { Text, View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import * as Location from 'expo-location'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { socketService } from '@/services/socket'

type RaceScreen = 'home' | 'create' | 'join' | 'lobby' | 'countdown' | 'active' | 'results'

interface Participant {
  id: string
  username: string
  wallet: string
  isHost: boolean
  distance: number
  pace: number
  finished: boolean
  finishTime?: number
}

interface Race {
  code: string
  host: string
  targetDistance: number
  participants: Participant[]
  status: string
  startTime: number | null
}

interface LeaderboardEntry {
  username: string
  distance: number
  pace: number
  progress: number
  finished: boolean
}

export default function Race() {
  const { account } = useMobileWallet()
  const [currentScreen, setCurrentScreen] = useState<RaceScreen>('home')
  const [raceCode, setRaceCode] = useState('')
  const [targetDistance, setTargetDistance] = useState('5')
  const [race, setRace] = useState<Race | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [countdown, setCountdown] = useState(3)
  const [myDistance, setMyDistance] = useState(0)
  const [myPace, setMyPace] = useState(0)
  const [results, setResults] = useState<Participant[]>([])
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null)
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null)
  const lastPosition = useRef<{ latitude: number; longitude: number } | null>(null)
  const raceStartTime = useRef<number>(0)
  const distanceAccumulator = useRef<number>(0)

  useEffect(() => {
    const socket = socketService.connect()

    socket.on('race_created', ({ code, race: newRace }) => {
      setRaceCode(code)
      setRace(newRace)
      setCurrentScreen('lobby')
    })

    socket.on('race_joined', ({ race: joinedRace }) => {
      setRace(joinedRace)
      setCurrentScreen('lobby')
    })

    socket.on('participant_joined', ({ race: updatedRace }) => {
      setRace(updatedRace)
    })

    socket.on('participant_left', ({ race: updatedRace }) => {
      setRace(updatedRace)
    })

    socket.on('countdown_started', () => {
      setCurrentScreen('countdown')
      setCountdown(3)
    })

    socket.on('countdown_tick', ({ count }) => {
      setCountdown(count)
    })

    socket.on('race_started', ({ startTime }) => {
      setCurrentScreen('active')
      raceStartTime.current = startTime
      startLocationTracking()
    })

    socket.on('leaderboard_update', ({ leaderboard: newLeaderboard }) => {
      setLeaderboard(newLeaderboard)
    })

    socket.on('participant_finished', ({ participant, position }) => {
      Alert.alert('Racer Finished!', `${participant.username} finished in position ${position}!`)
    })

    socket.on('race_finished', ({ results: finalResults }) => {
      stopLocationTracking()
      setResults(finalResults)
      setCurrentScreen('results')
    })

    socket.on('error', ({ message }) => {
      Alert.alert('Error', message)
    })

    return () => {
      stopLocationTracking()
      socketService.disconnect()
    }
  }, [])

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return

    const currentLoc = await Location.getCurrentPositionAsync({})
    setCurrentLocation(currentLoc)
    lastPosition.current = {
      latitude: currentLoc.coords.latitude,
      longitude: currentLoc.coords.longitude,
    }
    distanceAccumulator.current = 0

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (newLocation) => {
        setCurrentLocation(newLocation)
        
        if (!lastPosition.current) return

        const distanceDelta = calculateDistance(
          lastPosition.current.latitude,
          lastPosition.current.longitude,
          newLocation.coords.latitude,
          newLocation.coords.longitude
        )

        // Accumulate distance
        distanceAccumulator.current += distanceDelta / 1000 // Convert to km
        setMyDistance(distanceAccumulator.current)

        const elapsedTime = (Date.now() - raceStartTime.current) / 1000 / 60 // minutes
        const newPace = distanceAccumulator.current > 0 ? elapsedTime / distanceAccumulator.current : 0
        setMyPace(newPace)

        lastPosition.current = {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
        }

        socketService.emit('update_progress', {
          code: raceCode,
          distance: distanceAccumulator.current,
          pace: newPace,
        })
      }
    )
  }

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove()
      locationSubscription.current = null
    }
    lastPosition.current = null
    distanceAccumulator.current = 0
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const handleCreateRace = () => {
    if (!account) {
      Alert.alert('Error', 'Please connect your wallet first')
      return
    }

    socketService.emit('create_race', {
      targetDistance,
      username: 'User',
      wallet: account.address.toString(),
    })
  }

  const handleJoinRace = () => {
    if (!account) {
      Alert.alert('Error', 'Please connect your wallet first')
      return
    }

    if (!raceCode.trim()) {
      Alert.alert('Error', 'Please enter a race code')
      return
    }

    socketService.emit('join_race', {
      code: raceCode.toUpperCase(),
      username: 'User',
      wallet: account.address.toString(),
    })
  }

  const handleStartRace = () => {
    socketService.emit('start_race', { code: raceCode })
  }

  const handleLeaveRace = () => {
    stopLocationTracking()
    socketService.emit('leave_race', { code: raceCode })
    setRace(null)
    setRaceCode('')
    setMyDistance(0)
    setMyPace(0)
    setLeaderboard([])
    setCurrentScreen('home')
  }

  const handleEndRace = () => {
    Alert.alert(
      'End Race',
      'Are you sure you want to end this race? This will stop tracking for all participants.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Race',
          style: 'destructive',
          onPress: () => {
            stopLocationTracking()
            socketService.emit('end_race', { code: raceCode })
            setCurrentScreen('results')
          },
        },
      ]
    )
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const renderHomeScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Race Mode</Text>
      <Text style={styles.subtitle}>Compete with friends in real-time</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentScreen('create')}>
          <Text style={styles.primaryButtonText}>Create Race</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentScreen('join')}>
          <Text style={styles.secondaryButtonText}>Join Race</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works:</Text>
        <Text style={styles.infoText}>• Create or join a race with friends</Text>
        <Text style={styles.infoText}>• Set a target distance</Text>
        <Text style={styles.infoText}>• Race from anywhere in the world</Text>
        <Text style={styles.infoText}>• First to complete wins!</Text>
      </View>
    </View>
  )

  const renderCreateScreen = () => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Create Race</Text>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Target Distance (km)</Text>
        <TextInput
          style={styles.input}
          value={targetDistance}
          onChangeText={setTargetDistance}
          keyboardType="numeric"
          placeholder="Enter distance"
        />

        <Text style={styles.label}>Quick Select:</Text>
        <View style={styles.distanceButtons}>
          {['1', '3', '5', '10', '21'].map((dist) => (
            <TouchableOpacity
              key={dist}
              style={[styles.distanceButton, targetDistance === dist && styles.distanceButtonActive]}
              onPress={() => setTargetDistance(dist)}
            >
              <Text
                style={[
                  styles.distanceButtonText,
                  targetDistance === dist && styles.distanceButtonTextActive,
                ]}
              >
                {dist}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleCreateRace}>
          <Text style={styles.primaryButtonText}>Create Race</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('home')}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderJoinScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Join Race</Text>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Enter Race Code</Text>
        <TextInput
          style={styles.codeInput}
          value={raceCode}
          onChangeText={(text) => setRaceCode(text.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          autoCapitalize="characters"
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleJoinRace}>
          <Text style={styles.primaryButtonText}>Join Race</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('home')}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderLobbyScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Race Lobby</Text>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Race Code</Text>
        <Text style={styles.codeText}>{raceCode}</Text>
        <Text style={styles.codeSubtext}>Share this code with friends</Text>
      </View>

      <View style={styles.distanceCard}>
        <Text style={styles.distanceLabel}>Target Distance</Text>
        <Text style={styles.distanceValue}>{race?.targetDistance} km</Text>
      </View>

      <View style={styles.participantsCard}>
        <Text style={styles.participantsTitle}>Participants ({race?.participants.length})</Text>
        {race?.participants.map((p) => (
          <View key={p.id} style={styles.participantItem}>
            <View style={styles.participantDot} />
            <Text style={styles.participantName}>
              {p.username} {p.isHost && '(Host)'}
            </Text>
          </View>
        ))}
      </View>

      {race?.participants.some((p) => p.id === socketService.getSocket()?.id && p.isHost) && (
        <TouchableOpacity style={styles.primaryButton} onPress={handleStartRace}>
          <Text style={styles.primaryButtonText}>Start Race</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backButton} onPress={handleLeaveRace}>
        <Text style={styles.backButtonText}>Leave Race</Text>
      </TouchableOpacity>
    </View>
  )

  const renderCountdownScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.countdownText}>{countdown > 0 ? countdown : 'GO!'}</Text>
    </View>
  )

  const renderActiveScreen = () => (
    <View style={styles.activeContainer}>
      <Text style={styles.title}>Race in Progress</Text>

      {currentLocation && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={{
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            <Marker
              coordinate={{
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
              }}
              title="You"
              pinColor="#10b981"
            />
          </MapView>
        </View>
      )}

      <View style={styles.myStatsCard}>
        <Text style={styles.myStatsLabel}>Your Progress</Text>
        <Text style={styles.myStatsDistance}>
          {myDistance.toFixed(2)} / {race?.targetDistance} km
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((myDistance / (race?.targetDistance || 1)) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.myStatsPace}>Pace: {myPace > 0 ? myPace.toFixed(2) : '--'} min/km</Text>
      </View>

      <View style={styles.leaderboardCard}>
        <Text style={styles.leaderboardTitle}>Live Leaderboard</Text>
        <ScrollView style={styles.leaderboardScroll}>
          {leaderboard.map((entry, index) => (
            <View key={index} style={styles.leaderboardItem}>
              <Text style={styles.leaderboardRank}>#{index + 1}</Text>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>{entry.username}</Text>
                <Text style={styles.leaderboardStats}>
                  {entry.distance.toFixed(2)}km • {entry.progress.toFixed(0)}%
                  {entry.finished && ' ✓'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.endRaceButton} onPress={handleEndRace}>
        <Text style={styles.endRaceButtonText}>End Race</Text>
      </TouchableOpacity>
    </View>
  )

  const renderResultsScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Race Complete!</Text>

      <View style={styles.resultsCard}>
        <Text style={styles.resultsTitle}>Final Results</Text>
        {results.map((participant, index) => (
          <View key={participant.id} style={styles.resultItem}>
            <View style={styles.resultRankBadge}>
              <Text style={styles.resultRankText}>
                {participant.finished && index === 0 ? '🥇' : 
                 participant.finished && index === 1 ? '🥈' : 
                 participant.finished && index === 2 ? '🥉' : 
                 participant.finished ? `#${index + 1}` : 'DNF'}
              </Text>
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{participant.username}</Text>
              <Text style={styles.resultTime}>
                {participant.finished && participant.finishTime
                  ? `Time: ${formatTime(participant.finishTime)}`
                  : `Distance: ${participant.distance.toFixed(2)}km`}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleLeaveRace}>
        <Text style={styles.primaryButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {currentScreen === 'home' && renderHomeScreen()}
      {currentScreen === 'create' && renderCreateScreen()}
      {currentScreen === 'join' && renderJoinScreen()}
      {currentScreen === 'lobby' && renderLobbyScreen()}
      {currentScreen === 'countdown' && renderCountdownScreen()}
      {currentScreen === 'active' && renderActiveScreen()}
      {currentScreen === 'results' && renderResultsScreen()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  centerContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  scrollContainer: { flexGrow: 1, padding: 20 },
  activeContainer: { flex: 1, padding: 20 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 10, color: '#ffffff' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#888888', marginBottom: 40 },
  buttonContainer: { gap: 15, marginBottom: 40 },
  primaryButton: { 
    backgroundColor: '#00ff88', 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginTop: 20,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: { color: '#0a0a0a', fontSize: 18, fontWeight: '800' },
  secondaryButton: { 
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
  secondaryButtonText: { color: '#0a0a0a', fontSize: 18, fontWeight: '800' },
  backButton: { 
    backgroundColor: '#2a2a2a', 
    paddingVertical: 14, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  backButtonText: { color: '#888888', fontSize: 16, fontWeight: '600' },
  infoCard: { 
    backgroundColor: '#1a1a1a', 
    padding: 20, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  infoTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#ffffff' },
  infoText: { fontSize: 14, color: '#888888', marginBottom: 8 },
  formContainer: { width: '100%' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#ffffff' },
  input: { 
    borderWidth: 1, 
    borderColor: '#2a2a2a', 
    backgroundColor: '#1a1a1a',
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16, 
    marginBottom: 20,
    color: '#ffffff',
  },
  codeInput: { 
    borderWidth: 2, 
    borderColor: '#00d4ff', 
    backgroundColor: '#1a1a1a',
    borderRadius: 16, 
    padding: 20, 
    fontSize: 32, 
    fontWeight: '800', 
    textAlign: 'center', 
    letterSpacing: 4, 
    marginBottom: 20,
    color: '#00d4ff',
  },
  distanceButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  distanceButton: { 
    flex: 1, 
    minWidth: 60, 
    backgroundColor: '#1a1a1a', 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  distanceButtonActive: { 
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  distanceButtonText: { fontSize: 16, fontWeight: '600', color: '#888888' },
  distanceButtonTextActive: { color: '#0a0a0a' },
  codeCard: { 
    backgroundColor: '#1a1a1a', 
    padding: 24, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  codeLabel: { fontSize: 14, color: '#888888', marginBottom: 8 },
  codeText: { fontSize: 48, fontWeight: '800', color: '#00ff88', letterSpacing: 4 },
  codeSubtext: { fontSize: 12, color: '#666666', marginTop: 8 },
  distanceCard: { 
    backgroundColor: '#00d4ff', 
    padding: 20, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginBottom: 20,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  distanceLabel: { fontSize: 14, color: '#0a0a0a', marginBottom: 4, fontWeight: '600' },
  distanceValue: { fontSize: 36, fontWeight: '800', color: '#0a0a0a' },
  participantsCard: { 
    backgroundColor: '#1a1a1a', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  participantsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#ffffff' },
  participantItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  participantDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#00ff88', marginRight: 12 },
  participantName: { fontSize: 16, color: '#ffffff' },
  countdownText: { fontSize: 120, fontWeight: '800', textAlign: 'center', color: '#00ff88' },
  myStatsCard: { 
    backgroundColor: '#00ff88', 
    padding: 24, 
    borderRadius: 20, 
    marginBottom: 20,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  myStatsLabel: { fontSize: 14, color: '#0a0a0a', marginBottom: 8, fontWeight: '600' },
  myStatsDistance: { fontSize: 32, fontWeight: '800', color: '#0a0a0a', marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: 'rgba(10,10,10,0.2)', borderRadius: 4, marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: '#0a0a0a', borderRadius: 4 },
  myStatsPace: { fontSize: 16, color: '#0a0a0a', fontWeight: '600' },
  mapContainer: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  map: { width: '100%', height: '100%' },
  leaderboardCard: { 
    flex: 1, 
    backgroundColor: '#1a1a1a', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  leaderboardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#ffffff' },
  leaderboardScroll: { flex: 1 },
  leaderboardItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0f0f0f', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  leaderboardRank: { fontSize: 20, fontWeight: '800', color: '#00ff88', width: 40 },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  leaderboardStats: { fontSize: 14, color: '#888888' },
  resultsCard: { 
    backgroundColor: '#1a1a1a', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  resultsTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, textAlign: 'center', color: '#ffffff' },
  resultItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0f0f0f', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  resultRankBadge: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#2a2a2a', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  resultRankText: { fontSize: 24, fontWeight: '800' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  resultTime: { fontSize: 14, color: '#888888' },
  endRaceButton: { 
    backgroundColor: '#ff4444', 
    paddingVertical: 14, 
    borderRadius: 16, 
    alignItems: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  endRaceButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
})
