import Icon from './Icon'

const Modal = ({ open, onClose, title, children, footer, maxWidth = 540, fullscreen = false, toolbar }) => {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal${fullscreen ? ' modal-fullscreen' : ''}`}
        style={!fullscreen ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {toolbar}
            <button className="icon-btn" onClick={onClose}>
              <Icon name="x" />
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export default Modal
