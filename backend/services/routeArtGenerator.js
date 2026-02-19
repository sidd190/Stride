import { createCanvas } from 'canvas'

/**
 * Generate a unique color palette based on workout data
 */
function generateColorPalette(distance, duration, seed) {
  const hue1 = (distance * 50 + seed) % 360
  const hue2 = (hue1 + 120) % 360
  const hue3 = (hue1 + 240) % 360
  
  return {
    primary: `hsl(${hue1}, 85%, 60%)`,
    secondary: `hsl(${hue2}, 85%, 60%)`,
    accent: `hsl(${hue3}, 85%, 60%)`,
  }
}

/**
 * Generate unique geometric pattern based on workout data
 */
function drawUniquePattern(ctx, width, height, workoutData) {
  const { distance, duration } = workoutData
  const seed = distance * duration
  
  ctx.globalAlpha = 0.1
  
  for (let i = 0; i < 15; i++) {
    const x = (seed * i * 123) % width
    const y = (seed * i * 456) % height
    const radius = 50 + (seed * i) % 120
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `hsla(${(seed * i) % 360}, 80%, 60%, 0.2)`)
    gradient.addColorStop(1, 'transparent')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  
  ctx.globalAlpha = 1
}

/**
 * Generate route art from GPS coordinates
 */
export function generateRouteArt(coordinates, workoutData) {
  const width = 1200
  const height = 1200
  const topBarHeight = 200
  const bottomBarHeight = 220
  const sidePadding = 80
  
  // Route area dimensions
  const routeAreaTop = topBarHeight
  const routeAreaBottom = height - bottomBarHeight
  const routeAreaLeft = sidePadding
  const routeAreaRight = width - sidePadding
  const routeAreaWidth = routeAreaRight - routeAreaLeft
  const routeAreaHeight = routeAreaBottom - routeAreaTop

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // Generate unique color palette
  const colors = generateColorPalette(
    workoutData.distance,
    workoutData.duration,
    coordinates?.length || Date.now()
  )

  // Dark background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, '#0a0a0a')
  bgGradient.addColorStop(1, '#1a1a1a')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // Add unique background pattern
  drawUniquePattern(ctx, width, height, workoutData)

  // Top bar with glassmorphism
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.fillRect(0, 0, width, topBarHeight)
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, topBarHeight)
  ctx.lineTo(width, topBarHeight)
  ctx.stroke()

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 48px Arial'
  ctx.textAlign = 'left'
  ctx.fillText('WORKOUT', 60, 80)
  
  ctx.fillStyle = colors.primary
  ctx.fillText('COMPLETE', 60, 140)

  // Distance in top right
  const distance = workoutData.distance || 0
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '24px Arial'
  ctx.fillText('DISTANCE', width - 60, 60)
  
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 56px Arial'
  ctx.fillText(`${distance.toFixed(2)}`, width - 60, 120)
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.font = '28px Arial'
  ctx.fillText('KM', width - 60, 160)

  // Draw route if coordinates exist
  if (coordinates && coordinates.length >= 2) {
    // Find bounds
    const lats = coordinates.map(c => c.latitude)
    const lons = coordinates.map(c => c.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)

    const latRange = maxLat - minLat || 0.001
    const lonRange = maxLon - minLon || 0.001
    
    // Add extra padding for the route to prevent edge touching
    const routePadding = 40
    const scale = Math.min(
      (routeAreaWidth - 2 * routePadding) / lonRange,
      (routeAreaHeight - 2 * routePadding) / latRange
    )

    // Center the route in the available area
    const routeWidth = lonRange * scale
    const routeHeight = latRange * scale
    const offsetX = routeAreaLeft + routePadding + (routeAreaWidth - 2 * routePadding - routeWidth) / 2
    const offsetY = routeAreaTop + routePadding + (routeAreaHeight - 2 * routePadding - routeHeight) / 2

    function toCanvasCoords(lat, lon) {
      const x = offsetX + (lon - minLon) * scale
      const y = offsetY + routeHeight - (lat - minLat) * scale
      return { x, y }
    }

    // Clip to route area to prevent overflow
    ctx.save()
    ctx.beginPath()
    ctx.rect(routeAreaLeft, routeAreaTop, routeAreaWidth, routeAreaHeight)
    ctx.clip()

    // Draw glow effect
    ctx.strokeStyle = colors.primary
    ctx.lineWidth = 20
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = colors.primary
    ctx.shadowBlur = 30
    ctx.globalAlpha = 0.3

    ctx.beginPath()
    coordinates.forEach((coord, index) => {
      const { x, y } = toCanvasCoords(coord.latitude, coord.longitude)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Draw main route with gradient
    ctx.globalAlpha = 1
    const routeGradient = ctx.createLinearGradient(
      routeAreaLeft, 
      routeAreaTop, 
      routeAreaRight, 
      routeAreaBottom
    )
    routeGradient.addColorStop(0, colors.primary)
    routeGradient.addColorStop(0.5, colors.secondary)
    routeGradient.addColorStop(1, colors.accent)

    ctx.strokeStyle = routeGradient
    ctx.lineWidth = 10
    ctx.shadowBlur = 0

    ctx.beginPath()
    coordinates.forEach((coord, index) => {
      const { x, y } = toCanvasCoords(coord.latitude, coord.longitude)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Draw start marker
    const start = toCanvasCoords(coordinates[0].latitude, coordinates[0].longitude)
    ctx.shadowColor = colors.primary
    ctx.shadowBlur = 25
    ctx.fillStyle = colors.primary
    ctx.beginPath()
    ctx.arc(start.x, start.y, 18, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(start.x, start.y, 7, 0, Math.PI * 2)
    ctx.fill()

    // Draw end marker
    const end = toCanvasCoords(
      coordinates[coordinates.length - 1].latitude,
      coordinates[coordinates.length - 1].longitude
    )
    ctx.shadowColor = colors.accent
    ctx.shadowBlur = 25
    ctx.fillStyle = colors.accent
    ctx.beginPath()
    ctx.arc(end.x, end.y, 18, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(end.x, end.y, 7, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore() // Remove clipping
  } else {
    // No GPS data - show placeholder
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.fillRect(routeAreaLeft, routeAreaTop, routeAreaWidth, routeAreaHeight)
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.font = '32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('NO GPS DATA', width / 2, height / 2)
  }

  // Reset effects
  ctx.shadowBlur = 0

  // Bottom stats panel
  const panelY = height - bottomBarHeight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.fillRect(0, panelY, width, bottomBarHeight)
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, panelY)
  ctx.lineTo(width, panelY)
  ctx.stroke()

  // Duration
  const duration = workoutData.duration || 0
  const mins = Math.floor(duration / 60)
  const secs = duration % 60

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '20px Arial'
  ctx.fillText('DURATION', 60, panelY + 50)
  
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 48px Arial'
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 60, panelY + 105)

  // Pace
  const pace = workoutData.pace || 0
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '20px Arial'
  ctx.fillText('AVG PACE', 400, panelY + 50)
  
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 48px Arial'
  ctx.fillText(`${pace.toFixed(2)}`, 400, panelY + 105)
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.font = '24px Arial'
  ctx.fillText('min/km', 400, panelY + 150)

  // Date
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.font = '22px Arial'
  const date = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
  ctx.fillText(date, width - 60, panelY + 105)

  // Unique signature hash
  const hash = `#${Math.abs(
    (distance * 1000 + duration * 100 + (coordinates?.length || 0)) % 999999
  ).toString().padStart(6, '0')}`
  
  ctx.fillStyle = colors.primary
  ctx.font = 'bold 20px monospace'
  ctx.fillText(hash, width - 60, panelY + 160)

  return canvas.toBuffer('image/png')
}
