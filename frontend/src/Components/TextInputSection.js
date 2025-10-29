import React, { useState, useRef, useEffect } from "react";
import { CheckCircle, AlertCircle, Upload, X } from "lucide-react";

const TextInputSection = ({
  pastedText,
  handleTextPaste,
  pastedWordCount,
  uploadedPreview,
  corpusPreview,
  error,
  onFilesUploaded,
  comparisonMode = "corpus",
  referenceTextId = null,
  referenceTextName = null,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [hover, setHover] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState([]);
  const [draggedFileName, setDraggedFileName] = useState("");
  const dropzoneRef = useRef(null);
  const fileInputRef = useRef(null);

  const clickFilePicker = () => fileInputRef.current?.click();

  const uploadUserTextFiles = async (files) => {
    // Must be exactly two files
    if (files.length !== 2) {
      setUploadErrors(["Please select exactly two files."]);
      return;
    }
    const [file1, file2] = files;
    if (file1.name === file2.name && file1.size === file2.size) {
      setUploadErrors(["Please select two different files."]);
      return;
    }

    setUploading(true);
    setUploadErrors([]);
    setUploadSuccess([]);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("target_file", file1);
    formData.append("reference_file", file2);
    formData.append("comparison_mode", "user_text");

    try {
      const res = await fetch("http://localhost:8000/api/upload-files/", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();

      if (!data.success) {
        setUploadErrors([data.error || "Upload failed"]);
        return;
      }

      const updatedFiles = [
        {
          name: data.target_file.filename,
          size: data.target_file.file_size,
          wordCount: data.target_file.word_count,
          textContent: data.target_file.text_content,
          processed: true,
        },
        {
          name: data.reference_file.filename,
          size: data.reference_file.file_size,
          wordCount: data.reference_file.word_count,
          textContent: data.reference_file.text_content,
          processed: true,
        },
      ];

      setSelectedFiles(updatedFiles);
      setUploadSuccess([
        `✓ Target: ${updatedFiles[0].name} (${updatedFiles[0].wordCount} words)`,
        `✓ Reference: ${updatedFiles[1].name} (${updatedFiles[1].wordCount} words)`,
      ]);

      onFilesUploaded?.(
        updatedFiles.map((f) => f.textContent).join("\n\n--- Next File ---\n\n"),
        updatedFiles
      );
    } catch (err) {
      setUploadErrors([err.message || "Network error"]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files);

    if (comparisonMode === "user_text") {
      const newFiles = [...selectedFiles, ...fileArray];

      if (newFiles.length > 2) {
        setUploadErrors(["Please select exactly two files (target + reference)."]);
        return;
      }

      const oversized = newFiles.filter((f) => f.size > 5 * 1024 * 1024);
      if (oversized.length > 0) {
        setUploadErrors([
          `Files too large (max 5MB): ${oversized.map((f) => f.name).join(", ")}`,
        ]);
        return;
      }

      const invalidTypes = newFiles.filter(
        (f) => !f.name.toLowerCase().match(/\.(txt|doc|docx)$/)
      );
      if (invalidTypes.length > 0) {
        setUploadErrors([
          `Invalid file types: ${invalidTypes.map((f) => f.name).join(", ")}`,
        ]);
        return;
      }

      setSelectedFiles(newFiles);
      setUploadErrors([]);
      setUploadSuccess([]);

      if (newFiles.length === 2) uploadUserTextFiles(newFiles);
      return;
    }

    // Corpus mode
    const existing = new Set(selectedFiles.map((f) => `${f.name}-${f.size}`));
    const newCorpusFiles = fileArray.filter((f) => !existing.has(`${f.name}-${f.size}`));
    if (!newCorpusFiles.length) return;

    setSelectedFiles([...selectedFiles, ...newCorpusFiles]);
    uploadCorpusFiles(newCorpusFiles);
  };

  const uploadCorpusFiles = async (files) => {
    setUploading(true);
    setUploadErrors([]);
    setUploadSuccess([]);
    setUploadProgress(0);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("http://localhost:8000/api/upload-files/", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();

      if (!data.success) {
        setUploadErrors([data.error || "Upload failed"]);
        return;
      }

      const uploadedFiles = data.files.map((f) => ({
        name: f.filename,
        size: f.file_size || f.size,
        wordCount: f.word_count,
        textContent: f.text_content,
        processed: true,
      }));

      setSelectedFiles(uploadedFiles);
      setUploadSuccess(
        uploadedFiles.map((f, i) => `✓ ${i + 1}: ${f.name} (${f.wordCount} words)`)
      );

      onFilesUploaded?.(
        uploadedFiles.map((f) => f.textContent).join("\n\n--- Next File ---\n\n"),
        uploadedFiles
      );
    } catch (err) {
      setUploadErrors([err.message || "Network error"]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    if (newFiles.length === 0) {
      onFilesUploaded?.("", []);
      setUploadSuccess([]);
      setUploadErrors([]);
    }
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setUploadSuccess([]);
    setUploadErrors([]);
    onFilesUploaded?.("", []);
  };

  // DnD
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setHover(true);
      setDraggedFileName(e.dataTransfer.items[0].getAsFile()?.name || "");
    }
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const next = prev - 1;
      if (next === 0) {
        setHover(false);
        setDraggedFileName("");
      }
      return next;
    });
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(false);
    setDragCounter(0);
    setDraggedFileName("");

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = "";
  };

  useEffect(() => {
    const handleGlobalDrop = (e) => {
      if (!dropzoneRef.current?.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const handleGlobalDragOver = (e) => {
      if (!dropzoneRef.current?.contains(e.target)) {
        e.preventDefault();
      }
    };
    document.addEventListener("dragover", handleGlobalDragOver, false);
    document.addEventListener("drop", handleGlobalDrop, false);
    return () => {
      document.removeEventListener("dragover", handleGlobalDragOver, false);
      document.removeEventListener("drop", handleGlobalDrop, false);
    };
  }, []);

  const comparisonLabel =
    comparisonMode === "user_text"
      ? referenceTextName
        ? `Comparing against: ${referenceTextName}`
        : "Comparing against your selected text"
      : null;

  return (
    <div className="ttc-stack-md">
      {/* Helper callout */}
      <div className="ttc-callout">
        <p className="ttc-callout-title">Paste or upload your text</p>
        <p style={{ margin: 0 }}>
          Paste below or drag in a few files. We’ll show a quick preview and word count before you continue.
        </p>
      </div>

      {/* Paste area */}
      <div className="ttc-panel">
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <label className="homepage-label" style={{ color: "#1f2937", margin: 0 }}>
            Your Text
          </label>
          <span style={{ color: "#64748b", fontSize: ".9rem" }}>
            {pastedWordCount > 0 ? `${pastedWordCount} words` : "0 words"}
          </span>
        </div>

        <textarea
          value={pastedText}
          onChange={handleTextPaste}
          className="ttc-textarea"
          placeholder="Paste your text here…"
        />
      </div>

      {/* Dropzone */}
      <div
        ref={dropzoneRef}
        className={`ttc-dropzone${hover ? " is-dragover" : ""} ${uploading ? " uploading" : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={clickFilePicker}
        role="button"
        tabIndex={0}
      >
        {!uploading ? (
          <div>
            <Upload size={28} style={{ verticalAlign: "middle", marginRight: 8 }} />
            <div style={{ fontWeight: 700, marginTop: 6 }}>Drag & drop files here</div>
            {hover && draggedFileName && (
              <div style={{ marginTop: 4 }}>
                Release to upload: <strong>{draggedFileName}</strong>
              </div>
            )}
            <div style={{ marginTop: 6, color: "#475569" }}>
              Supported: <code>.txt</code>, <code>.doc</code>, <code>.docx</code> (max 5MB each). Max 5 files.
            </div>
            <div className="ttc-center-row" style={{ marginTop: 12 }}>
              <button type="button" className="ttc-button" onClick={clickFilePicker}>
                Select Files from Computer
              </button>
            </div>
          </div>
        ) : (
          <div style={{ width: "100%" }}>
            <div className="ttc-center-row" style={{ gap: 8, marginBottom: 10 }}>
              <Upload size={22} />
              <div>Uploading… {uploadProgress}%</div>
            </div>
            <div className="ttc-progress">
              <div
                className="ttc-progress__fill"
                style={{ width: `${uploadProgress}%` }}
              />
              <div className="progress-text">{uploadProgress}%</div>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden-file-input"
          onChange={handleFileSelect}
          accept=".txt,.doc,.docx"
          disabled={uploading}
        />
      </div>

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="ttc-files-section">
          <div className="ttc-files-header">
            <h4 className="ttc-title--sm" style={{ margin: 0 }}>Selected Files</h4>
            <button onClick={clearAllFiles} className="ttc-button ttc-button-sm">
              Clear All
            </button>
          </div>

          <div className="ttc-files-list">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="ttc-file-item">
                <div className="ttc-filemeta">
                  <CheckCircle size={16} />
                  <span className="file-details">
                    {file.name} ({Math.round(file.size / 1024)}KB)
                    {file.wordCount && (
                      <span className="word-count-info"> • {file.wordCount} words</span>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="ttc-remove"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Text Preview */}
      {comparisonMode === "user_text" && selectedFiles.length > 1 && (
        <div className="ttc-panel">
          <h3 className="ttc-title--sm" style={{ marginTop: 0 }}>Uploaded Text Preview</h3>
          <pre className="ttc-pre">
            {selectedFiles.slice(1).map((file, index) => {
              const previewText = file.textContent
                ? file.textContent.split("\n").slice(0, 4).join("\n")
                : "";
              return `${file.name}\n${previewText}${index < selectedFiles.slice(1).length - 1 ? "\n---\n" : ""}`;
            })}
          </pre>
        </div>
      )}

      {comparisonMode === "corpus" && selectedFiles.length > 0 && (
        <div className="ttc-panel">
          <h3 className="ttc-title--sm" style={{ marginTop: 0 }}>Uploaded Text Preview</h3>
          <pre className="ttc-pre">
            {selectedFiles
              .map((file) => {
                const previewText = file.textContent
                  ? file.textContent.split("\n").slice(0, 4).join("\n")
                  : "";
                return `${file.name}\n${previewText}`;
              })
              .join("\n")}
          </pre>
        </div>
      )}

      {/* Corpus / Reference Preview */}
      {corpusPreview && (
        <div className="ttc-panel">
          <h3 className="ttc-title--sm" style={{ marginTop: 0 }}>
            {comparisonMode === "user_text" ? "Reference Text Preview" : "Corpus Preview"}
          </h3>
          <pre className="ttc-pre">{corpusPreview}</pre>
        </div>
      )}

      {/* Success / Error banners */}
      {uploadSuccess.length > 0 && (
        <div className="ttc-banner ttc-banner--success" role="status">
          <div>
            {uploadSuccess.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CheckCircle size={16} /> {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadErrors.length > 0 && (
        <div className="ttc-banner ttc-banner--error" role="alert">
          <div>
            {uploadErrors.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <AlertCircle size={16} /> {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="ttc-banner ttc-banner--error" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}
    </div>
  );
};

export default TextInputSection;
