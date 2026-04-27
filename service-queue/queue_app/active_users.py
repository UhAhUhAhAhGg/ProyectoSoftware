import time
from threading import Lock

# Estructura: { "event_id": { "user_id": timestamp_last_seen } }
_active_sessions = {}
_lock = Lock()

def _cleanup_expired(event_id, timeout_minutes=2):
    """
    Elimina los usuarios que no han reportado actividad en los últimos `timeout_minutes`.
    """
    if event_id not in _active_sessions:
        return

    now = time.time()
    timeout_seconds = timeout_minutes * 60
    
    # Encontrar usuarios expirados
    expired_users = [
        user_id for user_id, last_seen in _active_sessions[event_id].items()
        if (now - last_seen) > timeout_seconds
    ]
    
    # Eliminarlos
    for user_id in expired_users:
        del _active_sessions[event_id][user_id]


def register_user_activity(event_id: str, user_id: str):
    """
    Registra o actualiza la actividad de un usuario en un evento.
    """
    with _lock:
        event_id_str = str(event_id)
        user_id_str = str(user_id)
        
        if event_id_str not in _active_sessions:
            _active_sessions[event_id_str] = {}
            
        _active_sessions[event_id_str][user_id_str] = time.time()


def remove_user_activity(event_id: str, user_id: str):
    """
    Remueve a un usuario de los activos (ej. si completó la compra o salió voluntariamente).
    """
    with _lock:
        event_id_str = str(event_id)
        user_id_str = str(user_id)
        
        if event_id_str in _active_sessions and user_id_str in _active_sessions[event_id_str]:
            del _active_sessions[event_id_str][user_id_str]


def get_active_users_count(event_id: str, timeout_minutes=2) -> int:
    """
    Retorna la cantidad de usuarios únicos actualmente activos en un evento.
    Limpia los expirados antes de contar.
    """
    with _lock:
        event_id_str = str(event_id)
        _cleanup_expired(event_id_str, timeout_minutes)
        
        if event_id_str not in _active_sessions:
            return 0
            
        return len(_active_sessions[event_id_str])


def is_user_active(event_id: str, user_id: str, timeout_minutes=2) -> bool:
    """
    Verifica si un usuario específico está activo actualmente.
    """
    with _lock:
        event_id_str = str(event_id)
        user_id_str = str(user_id)
        _cleanup_expired(event_id_str, timeout_minutes)
        
        if event_id_str not in _active_sessions:
            return False
            
        return user_id_str in _active_sessions[event_id_str]
