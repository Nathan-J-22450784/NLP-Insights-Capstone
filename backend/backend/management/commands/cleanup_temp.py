from django.core.management.base import BaseCommand
from backend.utils.session_utils import list_session_temp_folders


class Command(BaseCommand):
    help = "Clean up stale temporary upload folders"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days-old",
            type=int,
            default=7,
            help="Delete stale temp folders older than this many days (default: 7)",
        )

    def handle(self, *args, **options):
        days_old = options["days_old"]

        folders = list_session_temp_folders(days_old=days_old, delete_stale=True)

        deleted_count = 0
        skipped_count = 0

        for folder_path, status, last_modified in folders:
            if "stale" in status:
                deleted_count += 1
            else:
                skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"🗑 Deleted {deleted_count} stale temp folder(s), skipped {skipped_count} active folder(s)"
            )
        )
