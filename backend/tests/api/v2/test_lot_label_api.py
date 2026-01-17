from app.application.services.inventory.label_service import LabelService


def test_label_service_pdf_generation(db_session, setup_search_data):
    """Test that PDF bytes are generated."""
    service = LabelService(db_session)
    # setup_search_data creates lots with ids [1, 2, 3] usually
    # We can fetch first 2 lots
    from app.infrastructure.persistence.models import LotReceipt

    lots = db_session.query(LotReceipt).limit(2).all()
    ids = [lot.id for lot in lots]

    pdf_buffer = service.generate_label_pdf(ids)
    content = pdf_buffer.getvalue()

    assert content.startswith(b"%PDF-"), "Output should be a PDF"
    assert len(content) > 0


def test_download_labels_api(client, db_session, setup_search_data):
    """Test API endpoint."""
    from app.infrastructure.persistence.models import LotReceipt

    lots = db_session.query(LotReceipt).limit(2).all()
    ids = [lot.id for lot in lots]

    response = client.post("/api/v2/lot/labels/download", json={"lot_ids": ids})

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF-")
