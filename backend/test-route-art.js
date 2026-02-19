import { generateRouteArt } from './services/routeArtGenerator.js'
import fs from 'fs'

// Sample GPS coordinates (a simple square route)
const sampleCoordinates = [
  { latitude: 37.7749, longitude: -122.4194 },
  { latitude: 37.7759, longitude: -122.4194 },
  { latitude: 37.7759, longitude: -122.4184 },
  { latitude: 37.7749, longitude: -122.4184 },
  { latitude: 37.7749, longitude: -122.4194 },
]

// Sample workout data
const workoutData = {
  distance: 5.2,
  duration: 1530, // 25 minutes 30 seconds
  pace: 4.9,
}

console.log(' Generating route art...')

// Generate route art
const routeArt = generateRouteArt(sampleCoordinates, workoutData)
fs.writeFileSync('test-route-art.png', routeArt)
console.log('Route art saved to test-route-art.png')

console.log('\n Open the PNG file to see the generated artwork!')
