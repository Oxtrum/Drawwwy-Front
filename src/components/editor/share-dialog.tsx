import { useCallback, useEffect, useState } from 'react'
import * as projectsApi from '../../lib/api/projects-api'
import { useAuthStore } from '../../lib/stores/auth-store'
import type { Project } from '../../lib/stores/project-store'

export function ShareDialog({ project }: { project: Project | null }) {
  const token = useAuthStore(s => s.accessToken)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [members, setMembers] = useState<projectsApi.ProjectMember[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null)

  const canManage = project?.source === 'remote' && project.capabilities?.manage_sharing
  const load = useCallback(async (): Promise<void> => {
    if (!project?.remoteId || !token) return
    try { setMembers(await projectsApi.listMembers(token, project.remoteId)) } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los accesos') }
  }, [project?.remoteId, token])
  useEffect(() => { if (open) void load() }, [load, open])
  if (!canManage) return null

  const add = async (): Promise<void> => {
    if (!project?.remoteId || !token || !email.trim()) return
    try {
      await projectsApi.addMember(token, project.remoteId, { email: email.trim(), role })
      setEmail(''); setMessage('Acceso actualizado.'); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo compartir') }
  }
  const remove = async (member: projectsApi.ProjectMember): Promise<void> => {
    if (!project?.remoteId || !token || member.role === 'owner') return
    try { await projectsApi.removeMember(token, project.remoteId, member.user.id); await load() } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo revocar el acceso') }
  }
  const changeRole = async (member: projectsApi.ProjectMember, nextRole: 'editor' | 'viewer'): Promise<void> => {
    if (!project?.remoteId || !token || member.role === 'owner' || member.role === nextRole) return
    setUpdatingMemberId(member.user.id)
    try {
      await projectsApi.updateMember(token, project.remoteId, member.user.id, nextRole)
      setMessage('Permiso actualizado.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el permiso')
    } finally {
      setUpdatingMemberId(null)
    }
  }
  const copyLink = async (): Promise<void> => {
    if (!project?.remoteId) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/editor/${project.remoteId}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { setMessage('No se pudo copiar el enlace. Puedes copiarlo desde la barra del navegador.') }
  }
  const owner = members.find(member => member.role === 'owner')
  const collaborators = members.filter(member => member.role !== 'owner')

  return <>
    <button className="icon-btn" title="Compartir tablero" aria-label="Compartir tablero" onClick={() => setOpen(true)}>
      <svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3" /><circle cx="17" cy="6" r="3" /><circle cx="17" cy="18" r="3" /><path d="m10.5 10.5 4-3M10.5 13.5l4 3" /></svg>
    </button>
    {open && <div className="overlay" style={{ display: 'flex' }} onClick={() => setOpen(false)}>
      <div className="card dashboard-modal" onClick={event => event.stopPropagation()}>
        <h2>Compartir tablero</h2>
        <label className="modal-field"><span>Email de un usuario registrado</span><input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="persona@empresa.com" /></label>
        <label className="modal-field"><span>Permiso</span><select value={role} onChange={event => setRole(event.target.value as 'editor' | 'viewer')}><option value="editor">Puede editar</option><option value="viewer">Solo lectura</option></select></label>
        {message && <p className="hint">{message}</p>}
        <div className="actions"><button onClick={() => setOpen(false)}>Cerrar</button><button className="primary" disabled={!email.trim()} onClick={() => void add()}>Compartir</button></div>
        <div className="ctx-sep" />
        {owner && <section className="sharing-members" aria-label="Autor del tablero">
          <span className="sharing-section-label">Autor</span>
          <div className="sharing-member owner-member">
            <span>{owner.user.name}</span>
            <span className="member-role-label">Propietario</span>
          </div>
        </section>}
        {collaborators.length > 0 && <section className="sharing-members" aria-label="Usuarios con permisos">
          <span className="sharing-section-label">Usuarios con permiso</span>
          {collaborators.map(member => <div key={member.user.id} className="sharing-member">
            <span className="member-name">{member.user.name}</span>
            <select
              value={member.role}
              aria-label={`Permiso de ${member.user.name}`}
              disabled={updatingMemberId === member.user.id}
              onChange={event => void changeRole(member, event.target.value as 'editor' | 'viewer')}
            >
              <option value="editor">Puede editar</option>
              <option value="viewer">Solo lectura</option>
            </select>
            <button className="danger" disabled={updatingMemberId === member.user.id} onClick={() => void remove(member)}>Revocar</button>
          </div>)}
        </section>}
        <div className="ctx-sep" />
        <div className="modal-field">
          <span>Enlace para usuarios invitados</span>
          <div className="share-link-row">
            <input readOnly value={`${window.location.origin}/editor/${project.remoteId}`} aria-label="Enlace del tablero" />
            <button className="primary" onClick={() => void copyLink()}>{copied ? 'Copiado' : 'Copiar enlace'}</button>
          </div>
          <small className="hint">El enlace no concede acceso: la persona debe haber sido invitada e iniciar sesión.</small>
        </div>
      </div>
    </div>}
  </>
}
