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
import { useCanvasStore } from './canvasStore'
import { useHistoryStore } from './historyStore'
import { useSelectionStore } from './selectionStore'
import Inspector from './Inspector'

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
  const snap = useCanvasStore((s) => s.snap)
  const toggleSnap = useCanvasStore((s) => s.toggleSnap)
  const grid = useCanvasStore((s) => s.grid)
  const lineType = useCanvasStore((s) => s.lineType)
  const showMiniMap = useCanvasStore((s) => s.showMiniMap)
  const showControls = useCanvasStore((s) => s.showControls)
  const setLineType = useCanvasStore((s) => s.setLineType)
  const [shiftPressed, setShiftPressed] = useState(false)

  const rfRef = useRef(null)
  const instanceRef = useRef(null)
  const idRef = useRef(5)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  useEffect(() => {
    const down = (e) => { if (e.key === 'Shift') setShiftPressed(true) }
    const up = (e) => { if (e.key === 'Shift') setShiftPressed(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // init history once
  useEffect(() => {
    useHistoryStore.getState().init({ nodes: nodesRef.current, edges: edgesRef.current })
    // no deps: инициализируем один раз на монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onInit = useCallback((rf) => {
    instanceRef.current = rf
    requestAnimationFrame(() => rf.fitView({ padding: 0.2 }))
  }, [])

  // Hotkeys: Undo/Redo
  useEffect(() => {
    const onKey = (e) => {
      const inEditable = e.target.closest?.('input, textarea, [contenteditable="true"]')
      if (inEditable) return
      const meta = e.ctrlKey || e.metaKey
      if (!meta) return
      const lower = e.key.toLowerCase()
      if (lower === 'z') {
        e.preventDefault()
        const snap = e.shiftKey
          ? useHistoryStore.getState().redo()
          : useHistoryStore.getState().undo()
        if (snap) { setNodes(snap.nodes); setEdges(snap.edges) }
      } else if (lower === 'y') {
        e.preventDefault()
        const snap = useHistoryStore.getState().redo()
        if (snap) { setNodes(snap.nodes); setEdges(snap.edges) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setNodes, setEdges])

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) => {
        const newEdges = addEdge(
          { ...params, type: shiftPressed ? 'straight' : lineType, markerEnd: { type: MarkerType.ArrowClosed } },
          eds
        )
        useHistoryStore.getState().commit({ nodes: nodesRef.current, edges: newEdges })
        return newEdges
      }),
    [setEdges, shiftPressed, lineType]
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

    setNodes((nds) => {
      const newNodes = nds.concat({ id, position, data: { label: `Node ${id}` }, draggable: true })
      useHistoryStore.getState().commit({ nodes: newNodes, edges: edgesRef.current })
      return newNodes
    })
  }, [setNodes])

  const fit = useCallback(() => { instanceRef.current?.fitView({ padding: 0.2 }) }, [])

  const toJson = useCallback(() => ({ nodes, edges }), [nodes, edges])

  // Глубокий merge для node.data/edge.data
  const mergeData = (prev, patch) => (patch ? { ...(prev || {}), ...patch } : prev)

  const patchNode = useCallback((id, patch, opts = { commit: true }) => {
    setNodes((nds) => {
      const newNodes = nds.map((n) => {
        if (n.id !== id) return n
        const next = {
          ...n,
          ...(patch || {}),
          data: mergeData(n.data, patch?.data),
          position: patch?.position ? { ...(n.position || {}), ...patch.position } : n.position,
        }
        return next
      })
      if (opts.commit !== false) {
        useHistoryStore.getState().commit({ nodes: newNodes, edges: edgesRef.current })
      }
      return newNodes
    })
  }, [setNodes])

  const patchEdge = useCallback((id, patch, opts = { commit: true }) => {
    setEdges((eds) => {
      const newEdges = eds.map((e) => {
        if (e.id !== id) return e
        const next = {
          ...e,
          ...(patch || {}),
          data: mergeData(e.data, patch?.data),
        }
        return next
      })
      if (opts.commit !== false) {
        useHistoryStore.getState().commit({ nodes: nodesRef.current, edges: newEdges })
      }
      return newEdges
    })
  }, [setEdges])

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
      useHistoryStore.getState().commit({ nodes: parsed.nodes, edges: parsed.edges })
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
        useHistoryStore.getState().commit({ nodes: parsed.nodes || [], edges: parsed.edges || [] })
        fit()
      } catch {
        alert('Файл не похож на JSON граф')
      }
    }
    reader.readAsText(f)
    e.target.value = ''
  }, [setNodes, setEdges, fit])

  const canUndo = useHistoryStore((s) => s.canUndo)
  const canRedo = useHistoryStore((s) => s.canRedo)
  const doUndo = useCallback(() => {
    const snap = useHistoryStore.getState().undo()
    if (snap) { setNodes(snap.nodes); setEdges(snap.edges) }
  }, [setNodes, setEdges])
  const doRedo = useCallback(() => {
    const snap = useHistoryStore.getState().redo()
    if (snap) { setNodes(snap.nodes); setEdges(snap.edges) }
  }, [setNodes, setEdges])

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
          <ToolbarButton
            onClick={() => setLineType(lineType === 'smoothstep' ? 'straight' : 'smoothstep')}
            title="Переключить тип линий"
          >
            Line: {lineType}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => useCanvasStore.getState().toggleMiniMap()}
            title="MiniMap On/Off"
          >
            MiniMap: {showMiniMap ? 'On' : 'Off'}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => useCanvasStore.getState().toggleControls()}
            title="Controls On/Off"
          >
            Controls: {showControls ? 'On' : 'Off'}
          </ToolbarButton>
          <ToolbarButton onClick={toggleSnap} title="Вкл/выкл привязку к сетке">
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
          onNodeDragStop={() =>
            useHistoryStore.getState().commit({ nodes: nodesRef.current, edges: edgesRef.current })
          }
          onPaneClick={() => useSelectionStore.getState().clearSelection()}
          onNodeClick={(e, node) => {
            const st = useSelectionStore.getState()
            if (e.shiftKey) {
              const ids = new Set(st.selectedNodeIds)
              ids.add(node.id)
              // setFromRF ждёт объекты с id — передаём минимально
              st.setFromRF(Array.from(ids).map((id) => ({ id })), [])
            } else {
              st.setFromRF([node], [])
            }
          }}
          onEdgeClick={(e, edge) => {
            const st = useSelectionStore.getState()
            if (e.shiftKey) {
              const ids = new Set(st.selectedEdgeIds)
              ids.add(edge.id)
              st.setFromRF([], Array.from(ids).map((id) => ({ id })))
            } else {
              st.setFromRF([], [edge])
            }
          }}
          selectNodesOnDrag={false}
          nodesDraggable
          snapToGrid={snap}
          snapGrid={grid}
          connectionLineType={shiftPressed ? 'straight' : lineType}
          fitView
        >
          {showMiniMap && <MiniMap pannable zoomable className="minimap" />}
          {showControls && <Controls showInteractive={false} />}
          <Background gap={16} />
          <Inspector nodes={nodes} edges={edges} patchNode={patchNode} patchEdge={patchEdge} />
          <div style={{ position: 'absolute', right: 12, bottom: 16, display: 'flex', gap: 8, zIndex: 1001 }}>
            <button className="btn" onClick={doUndo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
              Undo
            </button>
            <button className="btn" onClick={doRedo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z / Ctrl+Y)">
              Redo
            </button>
          </div>
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
