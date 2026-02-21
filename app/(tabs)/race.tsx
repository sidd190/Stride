import React, { useState, useEffect, useRef } from 'react'
import { Text, View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import * as Location from 'expo-location'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { socketService } from '@/services/socket'
import { colors, spacing, typography } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '@/components/ui/Card'

type RaceScreen = 'home' | 'create' | 'join' | 'lobby' | 'countdown' | 'active' | 'results'
type RaceMode = 'solo' | 'relay'

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

interface TeamMember {
  id: string
  username: string
  wallet: string
  legOrder: number
  distance: number
  completed: boolean
  finishTime?: number
}

interface Team {
  id: string
  name: string
  color: string
  members: TeamMember[]
  currentLeg: number
  totalDistance: number
  finished: boolean
}

interface Race {
  code: string
  host: string
  targetDistance: number
  participants: Participant[]
  status: string
  startTime: number | null
}

interface RelayRace {
  code: string
  host: string
  distancePerLeg: number
  legsPerTeam: number
  teams: Team[]
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

const TEAM_COLORS = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b']
const TEAM_NAMES = ['ALPHA', 'BETA', 'GAMMA', 'DELTA']

export default function Race() {
  const { account } = useMobileWallet()
  const [currentScreen, setCurrentScreen] = useState<RaceScreen>('home')
  const [raceMode, setRaceMode] = useState<RaceMode>('solo')
  const [raceCode, setRaceCode] = useState('')
  const [targetDistance, setTargetDistance] = useState('5')
  const [distancePerLeg, setDistancePerLeg] = useState('2')
  const [legsPerTeam, setLegsPerTeam] = useState('4')
  const [numTeams, setNumTeams] = useState('4')
  const [race, setRace] = useState<Race | null>(null)
  const [relay, setRelay] = useState<RelayRace | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedLeg, setSelectedLeg] = useState<number>(1)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [countdown, setCountdown] = useState(3)
  const [myDistance, setMyDistance] = useState(0)
  const [myPace, setMyPace] = useState(0)
  const [results, setResults] = useState<Participant[]>([])
  const [relayResults, setRelayResults] = useState<Team[]>([])
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null)
  const [hasActiveBaton, setHasActiveBaton] = useState(false)
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null)
  const lastPosition = useRef<{ latitude: number; longitude: number } | null>(null)
  const raceStartTime = useRef<number>(0)
  const distanceAccumulator = useRef<number>(0)

  useEffect(() => {
    const socket = socketService.connect()

    // Solo race events
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

    // Relay race events
    socket.on('relay_created', ({ code, relay: newRelay }) => {
      setRaceCode(code)
      setRelay(newRelay)
      setCurrentScreen('lobby')
    })

    socket.on('relay_joined', ({ relay: joinedRelay }) => {
      setRelay(joinedRelay)
      setCurrentScreen('lobby')
    })

    socket.on('relay_updated', ({ relay: updatedRelay }) => {
      setRelay(updatedRelay)
      checkBatonStatus(updatedRelay)
    })

    socket.on('relay_fetched', ({ relay: fetchedRelay }) => {
      setRelay(fetchedRelay)
    })

    socket.on('baton_passed', ({ team, leg }) => {
      Alert.alert('Baton Passed', `Team ${team.name} passed to leg ${leg}`)
    })

    // Common events
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
      if (raceMode === 'solo') {
        startLocationTracking()
      } else {
        checkBatonStatus(relay)
      }
    })

    socket.on('relay_started', ({ startTime }) => {
      setCurrentScreen('active')
      raceStartTime.current = startTime
      checkBatonStatus(relay)
    })

    socket.on('leaderboard_update', ({ leaderboard: newLeaderboard }) => {
      setLeaderboard(newLeaderboard)
    })

    socket.on('participant_finished', ({ participant, position }) => {
      Alert.alert('Finished', `${participant.username} finished #${position}`)
    })

    socket.on('race_finished', ({ results: finalResults }) => {
      stopLocationTracking()
      setResults(finalResults)
      setCurrentScreen('results')
    })

    socket.on('relay_finished', ({ results: finalResults }) => {
      stopLocationTracking()
      setRelayResults(finalResults)
      setCurrentScreen('results')
    })

    socket.on('error', ({ message }) => {
      Alert.alert('Error', message)
    })

    return () => {
      stopLocationTracking()
      socketService.disconnect()
    }
  }, [raceMode, relay])

  const checkBatonStatus = (currentRelay: RelayRace | null) => {
    if (!currentRelay || !account) return

    const myTeam = currentRelay.teams.find(t => 
      t.members.some(m => m.wallet === account.address.toString())
    )

    if (!myTeam) return

    const myMember = myTeam.members.find(m => m.wallet === account.address.toString())
    if (!myMember) return

    const shouldHaveBaton = myTeam.currentLeg === myMember.legOrder && !myMember.completed
    
    if (shouldHaveBaton && !hasActiveBaton) {
      setHasActiveBaton(true)
      startLocationTracking()
      Alert.alert('Your Turn!', 'You have the baton. Start running!')
    } else if (!shouldHaveBaton && hasActiveBaton) {
      setHasActiveBaton(false)
      stopLocationTracking()
    }
  }

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

        distanceAccumulator.current += distanceDelta / 1000
        setMyDistance(distanceAccumulator.current)

        const elapsedTime = (Date.now() - raceStartTime.current) / 1000 / 60
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

        // Check if leg completed (for relay mode)
        if (raceMode === 'relay' && hasActiveBaton) {
          const targetDist = parseFloat(distancePerLeg)
          if (distanceAccumulator.current >= targetDist) {
            handleLegComplete()
          }
        }
      }
    )
  }

  const handleLegComplete = () => {
    socketService.emit('complete_leg', { code: raceCode })
    setHasActiveBaton(false)
    stopLocationTracking()
    Alert.alert('Leg Complete', 'Baton passed to next runner!')
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
      Alert.alert('Error', 'Connect wallet first')
      return
    }

    if (raceMode === 'solo') {
      console.log('Creating solo race with distance:', targetDistance)
      socketService.emit('create_race', {
        targetDistance,
        username: 'User',
        wallet: account.address.toString(),
      })
    } else {
      console.log('Creating relay race:', {
        distancePerLeg: parseFloat(distancePerLeg),
        legsPerTeam: parseInt(legsPerTeam),
      })
      socketService.emit('create_relay', {
        distancePerLeg: parseFloat(distancePerLeg),
        legsPerTeam: parseInt(legsPerTeam),
        numTeams: parseInt(numTeams),
        username: 'User',
        wallet: account.address.toString(),
      })
    }
  }

  const handleFetchRelay = () => {
    if (!raceCode.trim()) {
      Alert.alert('Error', 'Enter race code first')
      return
    }

    socketService.emit('fetch_relay', {
      code: raceCode.toUpperCase(),
    })
  }

  const handleJoinRace = () => {
    if (!account) {
      Alert.alert('Error', 'Connect wallet first')
      return
    }

    if (!raceCode.trim()) {
      Alert.alert('Error', 'Enter race code')
      return
    }

    if (raceMode === 'solo') {
      socketService.emit('join_race', {
        code: raceCode.toUpperCase(),
        username: 'User',
        wallet: account.address.toString(),
      })
    } else {
      if (!selectedTeam) {
        Alert.alert('Error', 'Select a team')
        return
      }

      socketService.emit('join_relay', {
        code: raceCode.toUpperCase(),
        teamId: selectedTeam,
        legOrder: selectedLeg,
        username: 'User',
        wallet: account.address.toString(),
      })
    }
  }

  const handleStartRace = () => {
    if (raceMode === 'solo') {
      socketService.emit('start_race', { code: raceCode })
    } else {
      socketService.emit('start_relay', { code: raceCode })
    }
  }

  const handleLeaveRace = () => {
    stopLocationTracking()
    if (raceMode === 'solo') {
      socketService.emit('leave_race', { code: raceCode })
    } else {
      socketService.emit('leave_relay', { code: raceCode })
    }
    setRace(null)
    setRelay(null)
    setRaceCode('')
    setSelectedTeam(null)
    setMyDistance(0)
    setMyPace(0)
    setLeaderboard([])
    setCurrentScreen('home')
  }

  const handleEndRace = () => {
    Alert.alert(
      'End Race',
      'Confirm end race?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
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
      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, raceMode === 'solo' && styles.modeButtonActive]}
          onPress={() => setRaceMode('solo')}
        >
          <Ionicons 
            name="person-outline" 
            size={24} 
            color={raceMode === 'solo' ? colors.background.primary : colors.text.tertiary} 
          />
          <Text style={[styles.modeButtonText, raceMode === 'solo' && styles.modeButtonTextActive]}>
            SOLO
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, raceMode === 'relay' && styles.modeButtonActive]}
          onPress={() => setRaceMode('relay')}
        >
          <Ionicons 
            name="people-outline" 
            size={24} 
            color={raceMode === 'relay' ? colors.background.primary : colors.text.tertiary} 
          />
          <Text style={[styles.modeButtonText, raceMode === 'relay' && styles.modeButtonTextActive]}>
            RELAY
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentScreen('create')}>
          <Text style={styles.primaryButtonText}>CREATE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentScreen('join')}>
          <Text style={styles.secondaryButtonText}>JOIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderCreateScreen = () => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.formContainer}>
        {raceMode === 'solo' ? (
          <>
            <Text style={styles.formLabel}>DISTANCE (KM)</Text>
            <TextInput
              style={styles.input}
              value={targetDistance}
              onChangeText={setTargetDistance}
              keyboardType="numeric"
              placeholderTextColor={colors.text.tertiary}
            />

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
                    {dist}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.formLabel}>DISTANCE PER LEG (KM)</Text>
            <TextInput
              style={styles.input}
              value={distancePerLeg}
              onChangeText={setDistancePerLeg}
              keyboardType="numeric"
              placeholderTextColor={colors.text.tertiary}
            />

            <View style={styles.distanceButtons}>
              {['1', '2', '3', '5'].map((dist) => (
                <TouchableOpacity
                  key={dist}
                  style={[styles.distanceButton, distancePerLeg === dist && styles.distanceButtonActive]}
                  onPress={() => setDistancePerLeg(dist)}
                >
                  <Text
                    style={[
                      styles.distanceButtonText,
                      distancePerLeg === dist && styles.distanceButtonTextActive,
                    ]}
                  >
                    {dist}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>NUMBER OF TEAMS</Text>
            <View style={styles.distanceButtons}>
              {['2', '3', '4'].map((teams) => (
                <TouchableOpacity
                  key={teams}
                  style={[styles.distanceButton, numTeams === teams && styles.distanceButtonActive]}
                  onPress={() => setNumTeams(teams)}
                >
                  <Text
                    style={[
                      styles.distanceButtonText,
                      numTeams === teams && styles.distanceButtonTextActive,
                    ]}
                  >
                    {teams}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>LEGS PER TEAM</Text>
            <View style={styles.distanceButtons}>
              {['2', '3', '4'].map((legs) => (
                <TouchableOpacity
                  key={legs}
                  style={[styles.distanceButton, legsPerTeam === legs && styles.distanceButtonActive]}
                  onPress={() => setLegsPerTeam(legs)}
                >
                  <Text
                    style={[
                      styles.distanceButtonText,
                      legsPerTeam === legs && styles.distanceButtonTextActive,
                    ]}
                  >
                    {legs}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={handleCreateRace}>
          <Text style={styles.actionButtonText}>CREATE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('home')}>
          <Text style={styles.backButtonText}>BACK</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderJoinScreen = () => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.formContainer}>
        <Text style={styles.formLabel}>RACE CODE</Text>
        <TextInput
          style={styles.codeInput}
          value={raceCode}
          onChangeText={(text) => setRaceCode(text.toUpperCase())}
          placeholder="XXXXXX"
          placeholderTextColor={colors.text.tertiary}
          maxLength={6}
          autoCapitalize="characters"
        />

        {raceMode === 'relay' && !relay && (
          <TouchableOpacity style={styles.actionButton} onPress={handleFetchRelay}>
            <Text style={styles.actionButtonText}>FETCH RELAY</Text>
          </TouchableOpacity>
        )}

        {raceMode === 'relay' && relay && (
          <>
            <Text style={styles.formLabel}>SELECT TEAM</Text>
            <View style={styles.teamsContainer}>
              {relay.teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamCard,
                    { borderColor: team.color },
                    selectedTeam === team.id && styles.teamCardActive,
                  ]}
                  onPress={() => setSelectedTeam(team.id)}
                >
                  <View style={[styles.teamColorDot, { backgroundColor: team.color }]} />
                  <Text style={styles.teamName}>{team.name}</Text>
                  <Text style={styles.teamMembers}>{team.members.length}/{relay.legsPerTeam}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>SELECT LEG</Text>
            <View style={styles.distanceButtons}>
              {Array.from({ length: relay.legsPerTeam }, (_, i) => i + 1).map((leg) => (
                <TouchableOpacity
                  key={leg}
                  style={[styles.distanceButton, selectedLeg === leg && styles.distanceButtonActive]}
                  onPress={() => setSelectedLeg(leg)}
                >
                  <Text
                    style={[
                      styles.distanceButtonText,
                      selectedLeg === leg && styles.distanceButtonTextActive,
                    ]}
                  >
                    {leg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={handleJoinRace}>
              <Text style={styles.actionButtonText}>JOIN</Text>
            </TouchableOpacity>
          </>
        )}

        {raceMode === 'solo' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleJoinRace}>
            <Text style={styles.actionButtonText}>JOIN</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('home')}>
          <Text style={styles.backButtonText}>BACK</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderLobbyScreen = () => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Card style={styles.codeCard}>
        <Text style={styles.codeLabel}>CODE</Text>
        <Text style={styles.codeText}>{raceCode}</Text>
      </Card>

      {raceMode === 'solo' ? (
        <>
          <Card style={styles.distanceCard}>
            <Text style={styles.distanceLabel}>TARGET</Text>
            <Text style={styles.distanceValue}>{race?.targetDistance} KM</Text>
          </Card>

          <Card style={styles.participantsCard}>
            <Text style={styles.participantsTitle}>PARTICIPANTS ({race?.participants.length})</Text>
            <View style={styles.participantsList}>
              {race?.participants.map((p) => (
                <View key={p.id} style={styles.participantItem}>
                  <View style={styles.participantDot} />
                  <Text style={styles.participantName}>
                    {p.username} {p.isHost && '(HOST)'}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : (
        <>
          <Card style={styles.distanceCard}>
            <Text style={styles.distanceLabel}>DISTANCE PER LEG</Text>
            <Text style={styles.distanceValue}>{relay?.distancePerLeg} KM</Text>
          </Card>

          <View style={styles.teamsLobbyContainer}>
            {relay?.teams.map((team) => (
              <Card key={team.id} style={[styles.teamLobbyCard, { borderLeftColor: team.color, borderLeftWidth: 4 }]}>
                <View style={styles.teamLobbyHeader}>
                  <View style={[styles.teamColorDot, { backgroundColor: team.color }]} />
                  <Text style={styles.teamLobbyName}>{team.name}</Text>
                  <Text style={styles.teamMembers}>{team.members.length}/{relay.legsPerTeam}</Text>
                </View>
                <View style={styles.teamMembersList}>
                  {team.members.map((member) => (
                    <View key={member.id} style={styles.teamMemberItem}>
                      <Text style={styles.legNumber}>LEG {member.legOrder}</Text>
                      <Text style={styles.memberName}>{member.username}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </>
      )}

      {((raceMode === 'solo' && race?.participants.some((p) => p.id === socketService.getSocket()?.id && p.isHost)) ||
        (raceMode === 'relay' && relay?.host === account?.address.toString())) && (
        <TouchableOpacity style={styles.actionButton} onPress={handleStartRace}>
          <Text style={styles.actionButtonText}>START</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backButton} onPress={handleLeaveRace}>
        <Text style={styles.backButtonText}>LEAVE</Text>
      </TouchableOpacity>
    </ScrollView>
  )

  const renderCountdownScreen = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.countdownText}>{countdown > 0 ? countdown : 'GO'}</Text>
    </View>
  )

  const renderActiveScreen = () => {
    if (raceMode === 'relay') {
      return (
        <View style={styles.activeContainer}>
          {currentLocation && hasActiveBaton && (
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
                  pinColor={colors.primary[500]}
                />
              </MapView>
            </View>
          )}

          {hasActiveBaton ? (
            <View style={styles.myStatsCard}>
              <View style={styles.batonIndicator}>
                <Ionicons name="flag" size={24} color={colors.primary[500]} />
                <Text style={styles.batonText}>YOU HAVE THE BATON</Text>
              </View>
              <Text style={styles.myStatsLabel}>YOUR LEG PROGRESS</Text>
              <Text style={styles.myStatsDistance}>
                {myDistance.toFixed(2)} / {relay?.distancePerLeg} KM
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min((myDistance / (relay?.distancePerLeg || 1)) * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>
          ) : (
            <Card style={styles.waitingCard}>
              <Ionicons name="time-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.waitingText}>WAITING FOR YOUR TURN</Text>
              <Text style={styles.waitingSubtext}>Watch your team's progress below</Text>
            </Card>
          )}

          <Card style={styles.leaderboardCard}>
            <Text style={styles.leaderboardTitle}>TEAM STANDINGS</Text>
            <ScrollView style={styles.leaderboardScroll}>
              {relay?.teams.map((team, index) => (
                <View key={team.id} style={styles.teamStandingItem}>
                  <View style={[styles.teamColorDot, { backgroundColor: team.color }]} />
                  <View style={styles.teamStandingInfo}>
                    <Text style={styles.teamStandingName}>{team.name}</Text>
                    <Text style={styles.teamStandingStats}>
                      Leg {team.currentLeg}/{relay.legsPerTeam} · {team.totalDistance.toFixed(2)}km
                      {team.finished && ' ✓'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Card>

          <TouchableOpacity style={styles.endButton} onPress={handleEndRace}>
            <Text style={styles.endButtonText}>END</Text>
          </TouchableOpacity>
        </View>
      )
    }

    // Solo mode
    return (
      <View style={styles.activeContainer}>
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
                pinColor={colors.primary[500]}
              />
            </MapView>
          </View>
        )}

        <View style={styles.myStatsCard}>
          <Text style={styles.myStatsLabel}>PROGRESS</Text>
          <Text style={styles.myStatsDistance}>
            {myDistance.toFixed(2)} / {race?.targetDistance}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((myDistance / (race?.targetDistance || 1)) * 100, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.myStatsPace}>
            {myPace > 0 ? myPace.toFixed(2) : '--'} MIN/KM
          </Text>
        </View>

        <Card style={styles.leaderboardCard}>
          <Text style={styles.leaderboardTitle}>LIVE RANKINGS</Text>
          <ScrollView style={styles.leaderboardScroll}>
            {leaderboard.map((entry, index) => (
              <View key={index} style={styles.leaderboardItem}>
                <Text style={styles.leaderboardRank}>{index + 1}</Text>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{entry.username}</Text>
                  <Text style={styles.leaderboardStats}>
                    {entry.distance.toFixed(2)}km · {entry.progress.toFixed(0)}%
                    {entry.finished && ' ✓'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </Card>

        <TouchableOpacity style={styles.endButton} onPress={handleEndRace}>
          <Text style={styles.endButtonText}>END</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderResultsScreen = () => {
    if (raceMode === 'relay') {
      return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Card style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>RELAY RESULTS</Text>
            <View style={styles.resultsList}>
              {relayResults.map((team, index) => (
                <View key={team.id} style={styles.relayResultItem}>
                  <View style={styles.relayResultHeader}>
                    <View style={[styles.teamColorDot, { backgroundColor: team.color }]} />
                    <Text style={styles.relayResultRank}>#{index + 1}</Text>
                    <Text style={styles.relayResultTeamName}>{team.name}</Text>
                  </View>
                  <Text style={styles.relayResultTime}>
                    {team.finished && team.finishTime
                      ? formatTime(team.finishTime)
                      : `${team.totalDistance.toFixed(2)}km`}
                  </Text>
                  <View style={styles.relayMembersList}>
                    {team.members.map((member) => (
                      <View key={member.id} style={styles.relayMemberItem}>
                        <Text style={styles.relayMemberLeg}>Leg {member.legOrder}</Text>
                        <Text style={styles.relayMemberName}>{member.username}</Text>
                        <Text style={styles.relayMemberTime}>
                          {member.completed && member.finishTime
                            ? formatTime(member.finishTime)
                            : '--'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </Card>

          <TouchableOpacity style={styles.actionButton} onPress={handleLeaveRace}>
            <Text style={styles.actionButtonText}>DONE</Text>
          </TouchableOpacity>
        </ScrollView>
      )
    }

    // Solo mode
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>RESULTS</Text>
          <View style={styles.resultsList}>
            {results.map((participant, index) => (
              <View key={participant.id} style={styles.resultItem}>
                <Text style={styles.resultRank}>{index + 1}</Text>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{participant.username}</Text>
                  <Text style={styles.resultTime}>
                    {participant.finished && participant.finishTime
                      ? formatTime(participant.finishTime)
                      : `${participant.distance.toFixed(2)}km`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <TouchableOpacity style={styles.actionButton} onPress={handleLeaveRace}>
          <Text style={styles.actionButtonText}>DONE</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RACE</Text>
      </View>
      
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
  container: { 
    flex: 1, 
    backgroundColor: colors.background.primary,
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
  centerContainer: { 
    flex: 1, 
    padding: spacing.lg, 
    justifyContent: 'center',
  },
  scrollContainer: { 
    flexGrow: 1, 
    padding: spacing.lg,
  },
  activeContainer: { 
    flex: 1, 
    padding: spacing.lg,
  },
  
  // Buttons
  buttonGroup: {
    gap: spacing.md,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
    width: '100%',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.lg,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modeButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  modeButtonText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  modeButtonTextActive: {
    color: colors.background.primary,
  },
  primaryButton: { 
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.xl,
    borderRadius: 4,
    alignItems: 'center',
  },
  primaryButtonText: { 
    ...typography.label,
    color: colors.background.primary,
    letterSpacing: 2,
  },
  secondaryButton: { 
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.xl,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryButtonText: { 
    ...typography.label,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  actionButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  actionButtonText: {
    ...typography.label,
    color: colors.background.primary,
    letterSpacing: 2,
  },
  backButton: { 
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  backButtonText: { 
    ...typography.label,
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
  endButton: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  endButtonText: {
    ...typography.label,
    color: colors.error,
    letterSpacing: 2,
  },
  
  // Form
  formContainer: { 
    width: '100%',
  },
  formLabel: { 
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    letterSpacing: 1.5,
  },
  input: { 
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  codeInput: { 
    borderWidth: 1,
    borderColor: colors.primary[500],
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
    padding: spacing.xl,
    fontSize: 32,
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: spacing.lg,
    color: colors.primary[500],
  },
  distanceButtons: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: spacing.sm, 
    marginBottom: spacing.lg,
  },
  distanceButton: { 
    flex: 1,
    minWidth: 60,
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.md,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  distanceButtonActive: { 
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  distanceButtonText: { 
    ...typography.body,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  distanceButtonTextActive: { 
    color: colors.background.primary,
  },
  teamsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderRadius: 4,
    borderWidth: 2,
    gap: spacing.md,
  },
  teamCardActive: {
    backgroundColor: colors.background.tertiary,
  },
  teamColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    letterSpacing: 0.5,
  },
  teamMembers: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  teamsLobbyContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  teamLobbyCard: {
    paddingVertical: spacing.lg,
  },
  teamLobbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  teamLobbyName: {
    ...typography.h4,
    color: colors.text.primary,
    flex: 1,
    letterSpacing: 1,
    fontWeight: '400',
  },
  teamMembersList: {
    gap: spacing.xs,
  },
  teamMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  legNumber: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    width: 50,
    letterSpacing: 1,
  },
  memberName: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  
  // Cards
  codeCard: { 
    paddingVertical: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  codeLabel: { 
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 1.5,
  },
  codeText: { 
    fontSize: 48,
    fontWeight: '300',
    color: colors.primary[500],
    letterSpacing: 8,
  },
  distanceCard: { 
    paddingVertical: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  distanceLabel: { 
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 1.5,
  },
  distanceValue: { 
    ...typography.h1,
    color: colors.text.primary,
    fontWeight: '300',
  },
  participantsCard: { 
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  participantsTitle: { 
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    letterSpacing: 1.5,
  },
  participantsList: {
    gap: spacing.sm,
  },
  participantItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  participantDot: { 
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[500],
    marginRight: spacing.md,
  },
  participantName: { 
    ...typography.body,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  
  // Countdown
  countdownText: { 
    fontSize: 120,
    fontWeight: '200',
    textAlign: 'center',
    color: colors.primary[500],
  },
  
  // Active Race
  mapContainer: { 
    width: '100%',
    height: 200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
  },
  map: { 
    width: '100%',
    height: '100%',
  },
  myStatsCard: { 
    backgroundColor: colors.background.secondary,
    padding: spacing.xl,
    borderRadius: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  myStatsLabel: { 
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 1.5,
  },
  myStatsDistance: { 
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '300',
    marginBottom: spacing.md,
  },
  progressBar: { 
    height: 4,
    backgroundColor: colors.background.primary,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  progressFill: { 
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 2,
  },
  myStatsPace: { 
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  batonIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: 4,
  },
  batonText: {
    ...typography.labelSmall,
    color: colors.primary[500],
    letterSpacing: 1.5,
  },
  waitingCard: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  waitingText: {
    ...typography.h4,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    letterSpacing: 1,
    fontWeight: '400',
  },
  waitingSubtext: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  teamStandingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: spacing.md,
  },
  teamStandingInfo: {
    flex: 1,
  },
  teamStandingName: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  teamStandingStats: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  relayResultItem: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  relayResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  relayResultRank: {
    ...typography.h3,
    color: colors.text.tertiary,
    fontWeight: '300',
  },
  relayResultTeamName: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    letterSpacing: 1,
    fontWeight: '400',
  },
  relayResultTime: {
    ...typography.h4,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  relayMembersList: {
    gap: spacing.xs,
    paddingLeft: spacing.xl,
  },
  relayMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  relayMemberLeg: {
    ...typography.caption,
    color: colors.text.tertiary,
    width: 50,
    letterSpacing: 0.5,
  },
  relayMemberName: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
    letterSpacing: 0.5,
  },
  relayMemberTime: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  leaderboardCard: { 
    flex: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  leaderboardTitle: { 
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    letterSpacing: 1.5,
  },
  leaderboardScroll: { 
    flex: 1,
  },
  leaderboardItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  leaderboardRank: { 
    ...typography.h4,
    color: colors.text.tertiary,
    width: 40,
    fontWeight: '300',
  },
  leaderboardInfo: { 
    flex: 1,
  },
  leaderboardName: { 
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  leaderboardStats: { 
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  
  // Results
  resultsCard: { 
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  resultsTitle: { 
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 2,
    fontWeight: '300',
  },
  resultsList: {
    gap: spacing.sm,
  },
  resultItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  resultRank: { 
    ...typography.h3,
    color: colors.text.tertiary,
    width: 50,
    fontWeight: '300',
  },
  resultInfo: { 
    flex: 1,
  },
  resultName: { 
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
    fontWeight: '400',
  },
  resultTime: { 
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
})
