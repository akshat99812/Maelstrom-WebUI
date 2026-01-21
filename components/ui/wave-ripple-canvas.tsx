"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { simulationFragmentShader, simulationVertexShader, renderFragmentShader, renderVertexShader } from "./shaders"

interface WaveRippleCanvasProps {
  mousePosition: { x: number; y: number }
  className?: string
  texts?: Array<{
    text: string
    size: number
    x: number
    y: number
    font?: string
    weight?: string
  }>
}

export function WaveRippleCanvas({
  mousePosition,
  className = "",
  texts = []
}: WaveRippleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isWebGLSupported, setIsWebGLSupported] = useState(true)
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene())
  const simSceneRef = useRef<THREE.Scene>(new THREE.Scene())
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const simMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  const renderMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  const rtARef = useRef<THREE.WebGLRenderTarget | null>(null)
  const rtBRef = useRef<THREE.WebGLRenderTarget | null>(null)
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const lastMouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const frameRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)

  // Update mouse position with velocity calculation
  useEffect(() => {
    const normalizedX = mousePosition.x
    const normalizedY = mousePosition.y
    lastMouseRef.current.copy(mouseRef.current)
    mouseRef.current.set(normalizedX, normalizedY)

    if (simMaterialRef.current) {
      simMaterialRef.current.uniforms.mouse.value.copy(mouseRef.current)
      simMaterialRef.current.uniforms.mouseVelocity.value.set(
        mouseRef.current.x - lastMouseRef.current.x,
        mouseRef.current.y - lastMouseRef.current.y
      )
    }
  }, [mousePosition])

  // Setup Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      // Camera setup
      cameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      })
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      rendererRef.current = renderer

      // Create render targets
      const rtOptions = {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false
      }
      rtARef.current = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions)
      rtBRef.current = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions)

      // Create text texture with enhanced font handling
      const textCanvas = document.createElement('canvas')
      textCanvas.width = window.innerWidth
      textCanvas.height = window.innerHeight
      const ctx = textCanvas.getContext('2d', { willReadFrequently: true })

      if (ctx) {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
        ctx.fillStyle = 'white'

        // Draw each text with proper font settings
        texts.forEach(({ text, size, x, y, font = 'Inter', weight = '400' }) => {
          ctx.font = `${weight} ${size}px ${font}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(text, x, y)
        })
      }

      const textTexture = new THREE.CanvasTexture(textCanvas)
      textTexture.minFilter = THREE.LinearFilter
      textTexture.magFilter = THREE.LinearFilter
      textTexture.needsUpdate = true

      // Create simulation material
      const simMaterial = new THREE.ShaderMaterial({
        vertexShader: simulationVertexShader,
        fragmentShader: simulationFragmentShader,
        uniforms: {
          textureA: { value: null },
          mouse: { value: mouseRef.current },
          mouseVelocity: { value: new THREE.Vector2() },
          resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          time: { value: 0 },
          frame: { value: 0 }
        }
      })
      simMaterialRef.current = simMaterial

      // Create render material
      const renderMaterial = new THREE.ShaderMaterial({
        vertexShader: renderVertexShader,
        fragmentShader: renderFragmentShader,
        uniforms: {
          textureA: { value: null },
          textureB: { value: textTexture }
        },
        transparent: true
      })
      renderMaterialRef.current = renderMaterial

      // Create meshes
      const geometry = new THREE.PlaneGeometry(2, 2)
      const simMesh = new THREE.Mesh(geometry, simMaterial)
      const renderMesh = new THREE.Mesh(geometry, renderMaterial)
      simSceneRef.current.add(simMesh)
      sceneRef.current.add(renderMesh)

      // Animation loop
      const animate = () => {
        if (!renderer || !simMaterialRef.current || !renderMaterialRef.current) return

        // Update simulation
        simMaterialRef.current.uniforms.time.value += 0.01
        simMaterialRef.current.uniforms.frame.value = frameRef.current++

        // Swap render targets
        const tmp = rtARef.current
        rtARef.current = rtBRef.current
        rtBRef.current = tmp

        if (rtARef.current && rtBRef.current) {
          // Simulation step
          simMaterialRef.current.uniforms.textureA.value = rtARef.current.texture
          renderer.setRenderTarget(rtBRef.current)
          renderer.render(simSceneRef.current, cameraRef.current!)

          // Final render
          renderMaterialRef.current.uniforms.textureA.value = rtBRef.current.texture
          renderer.setRenderTarget(null)
          renderer.render(sceneRef.current, cameraRef.current!)
        }

        animationFrameRef.current = requestAnimationFrame(animate)
      }

      animate()

      // Handle window resize
      const handleResize = () => {
        const width = window.innerWidth
        const height = window.innerHeight

        renderer.setSize(width, height)
        rtARef.current?.setSize(width, height)
        rtBRef.current?.setSize(width, height)
        simMaterial.uniforms.resolution.value.set(width, height)

        // Update text texture
        textCanvas.width = width
        textCanvas.height = height
        if (ctx) {
          ctx.fillStyle = 'black'
          ctx.fillRect(0, 0, width, height)
          ctx.fillStyle = 'white'

          texts.forEach(({ text, size, x, y, font = 'Inter', weight = '400' }) => {
            ctx.font = `${weight} ${size}px ${font}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(text, x, y)
          })

          textTexture.needsUpdate = true
        }
      }

      window.addEventListener('resize', handleResize)

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        renderer.dispose()
        rtARef.current?.dispose()
        rtBRef.current?.dispose()
        geometry.dispose()
        simMaterial.dispose()
        renderMaterial.dispose()
        textTexture.dispose()
      }
    } catch (error) {
      console.error("WebGL error:", error)
      setIsWebGLSupported(false)
    }
  }, [texts])

  if (!isWebGLSupported) {
    return <div className="text-red-500">WebGL is not supported in your browser</div>
  }

  return <canvas ref={canvasRef} className={className} />
}
