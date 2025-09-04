from django.urls import path
from . import views

urlpatterns = [
    path("analyse-keyness/", views.analyse_keyness, name="keyness_view"),
    path('corpus-preview/', views.get_corpus_preview, name='corpus-preview'),
    path('upload-files/', views.upload_files, name='upload_files'),
    path("analyse-keyness/", views.analyse_keyness, name="analyse_keyness"),
    path("keyness-results/<int:result_id>/", views.get_keyness_results, name="get_keyness_results"),

]





