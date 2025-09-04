from django.contrib.sessions.models import Session
from django.contrib.sessions.backends.db import SessionStore
from django.utils import timezone
from datetime import timedelta, datetime
from api.models import UserSession, UserUploadedFile, UserAnalysisHistory
import os
import tempfile
import shutil
import time
from celery import shared_task


class SessionManager:
    """Manage user sessions and data isolation"""

    @staticmethod
    def get_or_create_user_session(request):
        """Get or create a UserSession for the current request"""
        session_key = request.session.session_key

        # Create Django session if it doesn't exist
        if not session_key:
            request.session.create()
            session_key = request.session.session_key

        # Get or create UserSession
        user_session, created = UserSession.objects.get_or_create(
            session_key=session_key,
            defaults={
                'user': request.user if request.user.is_authenticated else None,
                'is_active': True
            }
        )

        # Update last activity
        if not created:
            user_session.last_activity = timezone.now()
            user_session.save(update_fields=['last_activity'])

        return user_session

    @staticmethod
    def get_user_files(request):
        """Get all files for the current user's session"""
        user_session = SessionManager.get_or_create_user_session(request)
        return UserUploadedFile.objects.filter(session=user_session)

    @staticmethod
    def save_user_file(request=None, session_key=None, filename="", original_filename="", file_size=0, file_type="",
                       text_content=""):
        """Save a file for the current user's session"""
        if request:
            user_session = SessionManager.get_or_create_user_session(request)
        elif session_key:
            user_session, _ = UserSession.objects.get_or_create(session_key=session_key, defaults={"is_active": True})
        else:
            raise ValueError("Either request or session_key must be provided.")

        user_file = UserUploadedFile.objects.create(
            session=user_session,
            filename=filename,
            original_filename=original_filename,
            file_size=file_size,
            file_type=file_type,
            text_content=text_content,
            word_count=len(text_content.split()),
            char_count=len(text_content),
        )

        return user_file

    @staticmethod
    def delete_user_file(request, file_id):
        """Delete a specific file for the current user"""
        user_session = SessionManager.get_or_create_user_session(request)
        try:
            user_file = UserUploadedFile.objects.get(
                id=file_id,
                session=user_session
            )
            user_file.delete()
            return True
        except UserUploadedFile.DoesNotExist:
            return False

    @staticmethod
    def clear_user_data(request):
        """Clear all data for the current user's session"""
        user_session = SessionManager.get_or_create_user_session(request)

        # Delete files and analysis history
        UserUploadedFile.objects.filter(session=user_session).delete()
        UserAnalysisHistory.objects.filter(session=user_session).delete()

        return True

    @staticmethod
    def save_analysis_result(request, analysis_type, input_text_preview, results):
        """Save analysis results for the current session"""
        user_session = SessionManager.get_or_create_user_session(request)

        analysis = UserAnalysisHistory.objects.create(
            session=user_session,
            analysis_type=analysis_type,
            input_text_preview=input_text_preview[:500],  # Limit preview
            results=results
        )

        return analysis

    @staticmethod
    def get_user_analysis_history(request, analysis_type=None):
        """Get analysis history for the current session"""
        user_session = SessionManager.get_or_create_user_session(request)

        queryset = UserAnalysisHistory.objects.filter(session=user_session)
        if analysis_type:
            queryset = queryset.filter(analysis_type=analysis_type)

        return queryset

    @staticmethod
    def cleanup_old_sessions(days_old=7):
        """Clean up old sessions and their data"""
        cutoff_date = timezone.now() - timedelta(days=days_old)

        # Get old sessions
        old_sessions = UserSession.objects.filter(last_activity__lt=cutoff_date)

        # Delete associated data
        for session in old_sessions:
            UserUploadedFile.objects.filter(session=session).delete()
            UserAnalysisHistory.objects.filter(session=session).delete()

        # Delete the sessions
        deleted_count = old_sessions.count()
        old_sessions.delete()

        return deleted_count

def list_session_temp_folders(days_old=7, delete_stale=False):
    """
    List all session-based temp folders and optionally delete stale ones.

    A folder is considered stale if:
    - It does not correspond to an active session, OR
    - Its last modification time is older than `days_old`.
    """
    temp_root = tempfile.gettempdir()
    prefix = "uploads_"

    # Active session keys in DB
    active_sessions = set(Session.objects.values_list("session_key", flat=True))

    found_folders = []
    cutoff_time = time.time() - (days_old * 24 * 60 * 60)

    for name in os.listdir(temp_root):
        if not name.startswith(prefix):
            continue

        folder_path = os.path.join(temp_root, name)
        if not os.path.isdir(folder_path):
            continue

        session_id = name[len(prefix):]

        # Get last modified time
        last_modified = os.path.getmtime(folder_path)
        last_modified_dt = datetime.fromtimestamp(last_modified)

        # Determine status
        if session_id in active_sessions:
            status = "active"
        elif last_modified < cutoff_time:
            status = f"stale (> {days_old} days old)"
        else:
            status = "stale (inactive session)"

        found_folders.append((folder_path, status, last_modified_dt))

        # Delete if stale and requested
        if "stale" in status and delete_stale:
            try:
                shutil.rmtree(folder_path)
                print(f"🗑 Deleted stale folder: {folder_path}")
            except Exception as e:
                print(f"⚠️ Could not delete {folder_path}: {e}")

    return found_folders
