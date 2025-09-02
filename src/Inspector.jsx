import React, { useMemo, useState } from 'react'
import { useSelectionStore } from './selectionStore'

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function Inspector({ nodes, edges, patchNode, patchEdge }) {
  const nodeIds = useSelectionStore((s) => s.selectedNodeIds)
  const edgeIds = useSelectionStore((s) => s.selectedEdgeIds)

  const selectedNodes = useMemo(() => nodes.filter((n) => nodeIds.includes(n.id)), [nodes, nodeIds])
  const selectedEdges = useMemo(() => edges.filter((e) => edgeIds.includes(e.id)), [edges, edgeIds])

  const singleNode = selectedNodes.length === 1 ? selectedNodes[0] : null
  const singleEdge = selectedEdges.length === 1 ? selectedEdges[0] : null
  const active = selectedNodes.length > 0 || selectedEdges.length > 0

  const [nodeLabelDraft, setNodeLabelDraft] = useState('')
  const [edgeLabelDraft, setEdgeLabelDraft] = useState('')

  // Синхронизация локального драфта с выбранным узлом/ребром
  React.useEffect(() => {
    setNodeLabelDraft(singleNode?.data?.label ?? '')
  }, [singleNode?.id])
  React.useEffect(() => {
    setEdgeLabelDraft(singleEdge?.data?.label ?? '')
  }, [singleEdge?.id])

  const card = { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }
  const labelStyle = { display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }
  const inputStyle = { width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }
  const selectStyle = inputStyle
  const rightPanel = {
    position: 'absolute',
    top: 12, right: 12, bottom: 12, width: 340, overflow: 'auto',
    zIndex: 1000,                  // всегда поверх графа, когда панель видна
    pointerEvents: 'auto',
    display: 'flex', flexDirection: 'column', gap: 12,
  }

  if (!active) return null
  return (
    <div style={rightPanel}>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Inspector</div>

        {/* Узлы */}
        {singleNode ? (
          <>
            <div style={{ marginBottom: 8, color: '#888' }}>Node: <b>{singleNode.id}</b></div>
            <Section title="Label">
              <label style={labelStyle}>Text</label>
              <input
                style={inputStyle}
                value={nodeLabelDraft}
                onChange={(e) => {
                  setNodeLabelDraft(e.target.value)
                  // живое обновление без коммита в историю
                  patchNode(singleNode.id, { data: { label: e.target.value } }, { commit: false })
                }}
                onBlur={() => {
                  // один коммит на завершение редактирования
                  patchNode(singleNode.id, { data: { label: nodeLabelDraft } }, { commit: true })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                placeholder="Node label…"
              />
            </Section>

            <Section title="Type">
              <select
                style={selectStyle}
                value={singleNode.type || 'default'}
                onChange={(e) => patchNode(singleNode.id, { type: e.target.value || undefined })}
              >
                <option value="default">default</option>
                <option value="input">input</option>
                <option value="output">output</option>
              </select>
            </Section>
          </>
        ) : selectedNodes.length > 1 ? (
          <div style={{ color: '#666' }}>Nodes selected: <b>{selectedNodes.length}</b> (для простоты — редактирование полей для multi будет позже)</div>
        ) : null}

        {/* Рёбра */}
        {singleEdge ? (
          <>
            <div style={{ margin: '12px 0 8px', color: '#888' }}>Edge: <b>{singleEdge.id}</b></div>
            <Section title="Label">
              <label style={labelStyle}>Text</label>
              <input
                style={inputStyle}
                value={edgeLabelDraft}
                onChange={(e) => {
                  setEdgeLabelDraft(e.target.value)
                  patchEdge(singleEdge.id, { data: { label: e.target.value } }, { commit: false })
                }}
                onBlur={() => {
                  patchEdge(singleEdge.id, { data: { label: edgeLabelDraft } }, { commit: true })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                placeholder="Edge label…"
              />
            </Section>

            <Section title="Type">
              <select
                style={selectStyle}
                value={singleEdge.type || 'smoothstep'}
                onChange={(e) => patchEdge(singleEdge.id, { type: e.target.value || undefined })}
              >
                <option value="smoothstep">smoothstep</option>
                <option value="straight">straight</option>
                <option value="bezier">bezier</option>
              </select>
            </Section>
          </>
        ) : selectedEdges.length > 1 ? (
          <div style={{ color: '#666' }}>Edges selected: <b>{selectedEdges.length}</b></div>
        ) : null}

        {(!singleNode && !singleEdge && selectedNodes.length === 0 && selectedEdges.length === 0) && (
          <div style={{ color: '#888' }}>Нет выделения. Кликните по узлу или ребру.</div>
        )}
      </div>
    </div>
  )
}
