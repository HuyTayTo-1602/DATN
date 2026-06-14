import Icon from './Icon'

const EmptyState = ({ icon = 'inbox', title, description, action }) => (
  <div className="empty-state">
    <div className="empty-icon">
      <Icon name={icon} size={32} />
    </div>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
)

export default EmptyState
