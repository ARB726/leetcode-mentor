import io
import zipfile

from deploy.aws_live import source_archive


def test_build_archive_excludes_secrets_and_workstation_files():
    content, digest = source_archive()
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        names = archive.namelist()
        assert "Dockerfile" in names
        assert "app.py" in names
        assert "agents/interviewer.py" in names
        assert ".streamlit/config.toml" in names
        assert not any(name.startswith((".git/", ".venv/", ".tools/")) for name in names)
        assert not any(name.endswith((".env", "secrets.toml")) for name in names)
    assert digest == source_archive()[1]
