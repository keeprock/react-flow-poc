import React, { useCallback, useRef, useState, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'

const initialNodes = [
  { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Intent' }, type: 'input' },
  { id: 'n2', position: { x: 240, y: -40 }, data: { label: 'Classifier' } },
  { id: 'n3', position: { x: 480, y: -40 }, data: { label: 'Tool / Agent' } },
  { id: 'n4', position: { x: 720, y: 0 }, data: { label: 'Output' }, type: 'output' },
]

const initialEdges = [
  { id: 'e1-2', source: 'n1', target: 'n2', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-3', source: 'n2', target: 'n3', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-4', source: 'n3', target: 'n4', markerEnd: { type: MarkerType.ArrowClosed } },
]

function ToolbarButton({ onClick, children, title }) {
  return (
    <button onClick={onClick} title={title} className="btn">
      {children}
    </button>
  )
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [showLoader, setShowLoader] = useState(false)
  const [loaderText, setLoaderText] = useState('')
  const [snap, setSnap] = useState(true)
  const [shiftPressed, setShiftPressed] = useState(false)

  const rfRef = useRef(null)
  const instanceRef = useRef(null)
  const idRef = useRef(5)

  useEffect(() => {
    const down = (e) => { if (e.key === 'Shift') setShiftPressed(true) }
    const up = (e) => { if (e.key === 'Shift') setShiftPressed(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const onInit = useCallback((rf) => {
    instanceRef.current = rf
    requestAnimationFrame(() => rf.fitView({ padding: 0.2 }))
  }, [])

  const onConnect = useCallback(
    (params) => setEdges((eds) =>
      addEdge({ ...params, type: shiftPressed ? 'straight' : 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds)
    ),
    [setEdges, shiftPressed]
  )

  const addNode = useCallback(() => {
    const rf = instanceRef.current
    const id = `n${idRef.current++}`
    let position = { x: 80, y: 80 }

    if (rf && rfRef.current) {
      const rect = rfRef.current.getBoundingClientRect()
      const centerScreen = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      const center = rf.screenToFlowPosition(centerScreen)
      position = { x: center.x - 60, y: center.y - 20 }
    }

    setNodes((nds) => nds.concat({ id, position, data: { label: `Node ${id}` }, draggable: true }))
  }, [setNodes])

  const fit = useCallback(() => { instanceRef.current?.fitView({ padding: 0.2 }) }, [])

  const toJson = useCallback(() => ({ nodes, edges }), [nodes, edges])

  const saveJson = useCallback(() => {
    const data = JSON.stringify(toJson(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reactflow-graph.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [toJson])

  const copyJson = useCallback(async () => {
    const data = JSON.stringify(toJson(), null, 2)
    await navigator.clipboard.writeText(data)
  }, [toJson])

  const openLoader = useCallback(() => setShowLoader(true), [])
  const closeLoader = useCallback(() => setShowLoader(false), [])

  const applyJson = useCallback(() => {
    try {
      const parsed = JSON.parse(loaderText)
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        alert('Ожидаю { nodes: [], edges: [] }')
        return
      }
      setNodes(parsed.nodes)
      setEdges(parsed.edges)
      closeLoader()
      requestAnimationFrame(() => fit())
    } catch (e) {
      alert('Некорректный JSON')
    }
  }, [loaderText, setNodes, setEdges, closeLoader, fit])

  const onFile = useCallback((e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        setNodes(parsed.nodes || [])
        setEdges(parsed.edges || [])
        fit()
      } catch {
        alert('Файл не похож на JSON графа')
      }
    }
    reader.readAsText(f)
    e.target.value = ''
  }, [setNodes, setEdges, fit])

  return (
    <div className="app">
      <div className="toolbar">
        <div className="toolbar-left">ReactFlow PoC — узловой сценарный граф</div>
        <div className="toolbar-right">
          <ToolbarButton onClick={addNode} title="Добавить узел">+ Node</ToolbarButton>
          <ToolbarButton onClick={fit} title="Подогнать вид">Fit</ToolbarButton>
          <ToolbarButton onClick={saveJson} title="Скачать JSON">Save JSON</ToolbarButton>
          <ToolbarButton onClick={copyJson} title="Скопировать JSON">Copy JSON</ToolbarButton>
          <label className="btn btn-ghost" title="Загрузить JSON из файла">
            Load file
            <input type="file" accept="application/json" className="hidden-input" onChange={onFile} />
          </label>
          <ToolbarButton onClick={openLoader} title="Вставить JSON">Paste JSON</ToolbarButton>
          <ToolbarButton onClick={() => setSnap((s) => !s)} title="Вкл/выкл привязку к сетке">
            Snap: {snap ? 'On' : 'Off'}
          </ToolbarButton>
          <span className="hint">Shift: {shiftPressed ? 'STRAIGHT' : 'SMOOTH'}</span>
        </div>
      </div>

      <div ref={rfRef} className="canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          nodesDraggable
          snapToGrid={snap}
          snapGrid={[16, 16]}
          connectionLineType={shiftPressed ? 'straight' : 'smoothstep'}
          fitView
        >
          <MiniMap pannable zoomable className="minimap" />
          <Controls showInteractive={false} />
          <Background gap={16} />
        </ReactFlow>
      </div>

      {showLoader && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">Вставьте JSON графа</div>
            <div className="modal-body">
              <textarea
                className="textarea"
                placeholder='{"nodes":[],"edges":[]}' 
                value={loaderText}
                onChange={(e) => setLoaderText(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button onClick={closeLoader} className="btn btn-ghost">Отмена</button>
              <button onClick={applyJson} className="btn">Загрузить</button>
            </div>
          </div>
        </div>
      )}

      <div className="footnote">
        Drag для соединения узлов; колесо — зум, зажатый пробел — пан. Shift — прямые рёбра. Snap включает «липкую» сетку.
      </div>
    </div>
  )
}
