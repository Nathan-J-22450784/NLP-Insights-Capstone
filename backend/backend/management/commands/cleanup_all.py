from django.core.management.base import BaseCommand
from backend.utils.session_utils import SessionManager, list_session_temp_folders


class Command(BaseCommand):
    help = "Clean up old sessions, associated data, and stale temp folders"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days-old",
            type=int,
            default=7,
            help="Delete sessions and stale temp folders older than this many days (default: 7)",
        )

    def handle(self, *args, **options):
        days_old = options["days_old"]

        # 1️⃣ Clean up old sessions and associated DB data
        deleted_sessions = SessionManager.cleanup_old_sessions(days_old)
        self.stdout.write(
            self.style.SUCCESS(
                f"🗑 Deleted {deleted_sessions} old session(s) and their associated data"
            )
        )

        # 2️⃣ Clean up stale temp folders
        folders = list_session_temp_folders(days_old=days_old, delete_stale=True)
        deleted_count = 0
        skipped_count = 0

        for folder_path, status, _ in folders:
            if "stale" in status:
                deleted_count += 1
            else:
                skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"🗑 Deleted {deleted_count} stale temp folder(s), skipped {skipped_count} active folder(s)"
            )
        )

        self.stdout.write(
            self.style.SUCCESS("✅ Cleanup complete")
        )
