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


def test_web_archive_contains_only_runtime_sources_and_no_keys_or_benchmarks():
    content, digest = source_archive(web=True)
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        names = archive.namelist()
        assert "package-lock.json" in names
        assert "src/lib/server/pipeline.ts" in names
        assert "FROM node:" in archive.read("Dockerfile").decode()
        assert not any("node_modules" in name or "benchmarks" in name or ".env" in name for name in names)
        assert not any(name.startswith(("tests/", ".git/", ".venv/")) for name in names)
    assert digest.startswith("web-")
    assert digest == source_archive(web=True)[1]
