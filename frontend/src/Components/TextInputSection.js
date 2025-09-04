import React, { useState, useRef } from "react";
import { CheckCircle, AlertCircle, Upload, X } from "lucide-react";
import "./Keyness/KeynessLanding.css";

const TextInputSection = ({
  pastedText,
  handleTextPaste,
  pastedWordCount,
  uploadedPreview,
  corpusPreview,
  error,
  onFilesUploaded
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [hover, setHover] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState([]);
  const [draggedFileName, setDraggedFileName] = useState("");
  const dropzoneRef = useRef(null);

  // --- Upload queue: upload files one by one ---
  const uploadFile = async (file, index) => {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:8000/api/upload-files/", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setSelectedFiles(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], uploadProgress: percent };
          return updated;
        });
      }
    };

    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } catch {
        resolve({ success: false, error: "Invalid server response" });
      }
    };

    xhr.onerror = () => resolve({ success: false, error: "Network error" });
    xhr.send(formData);
  });
};

const processQueue = async (files) => {
  setUploading(true);
  setUploadErrors([]);
  setUploadSuccess([]);

  const newSelectedFiles = [...selectedFiles];

  for (let file of files) {
    // Add file to selectedFiles with initial state
    const fileState = {
      name: file.name,
      size: file.size,
      processed: false,
      wordCount: null,
      charCount: null,
      previewText: "",
      uploadProgress: 0,
      processed: false,
    };
    newSelectedFiles.push(fileState);
    setSelectedFiles([...newSelectedFiles]);
    const index = newSelectedFiles.length - 1;

    // Upload the file
    const result = await uploadFile(file, index);

    if (result.success && result.files?.[0]) {
      const data = result.files[0];
      newSelectedFiles[index] = {
    ...newSelectedFiles[index],
    processed: true,
    wordCount: data.word_count,
    charCount: data.char_count,
    previewText: data.text_content.split("\n").slice(0, 4).join("\n"),
    fullText: data.text_content,   
    uploadProgress: 100,
};

      setSelectedFiles([...newSelectedFiles]);
      setUploadSuccess(prev => [
        ...prev,
        `✓ ${file.name} uploaded successfully (${data.word_count} words)`
      ]);
      const combinedText = newSelectedFiles
  .filter(f => f.processed)
  .map(f => f.fullText)
  .join("\n\n--- Next File ---\n\n");

onFilesUploaded && onFilesUploaded(combinedText, newSelectedFiles);


    } else {
      setUploadErrors(prev => [
        ...prev,
        result.error || `${file.name} upload failed`
      ]);
    }
  }

  setUploading(false);
};

  // --- File handling ---
  const handleFiles = (files) => {
    const fileArray = Array.from(files);

    // Deduplicate by name + size
    const existing = new Set(selectedFiles.map((f) => `${f.name}-${f.size}`));
    const newFiles = fileArray.filter(f => !existing.has(`${f.name}-${f.size}`));

    if (newFiles.length < fileArray.length) setUploadErrors(["Some duplicate files were skipped"]);
    if (newFiles.length === 0) return;
    if (newFiles.length > 5) { setUploadErrors(["Maximum 5 files allowed"]); return; }

    const oversizedFiles = newFiles.filter(f => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) { setUploadErrors([`Files too large: ${oversizedFiles.map(f=>f.name).join(", ")}`]); return; }

    const invalidTypes = newFiles.filter(f => !f.name.toLowerCase().match(/\.(txt|doc|docx)$/));
    if (invalidTypes.length > 0) { setUploadErrors([`Invalid file types: ${invalidTypes.map(f=>f.name).join(", ")}`]); return; }

    setUploadErrors([]);
    processQueue(newFiles);
  };

  const removeFile = (indexToRemove) => {
    const newFiles = selectedFiles.filter((_, i) => i !== indexToRemove);
    setSelectedFiles(newFiles);
    if (newFiles.length === 0) onFilesUploaded && onFilesUploaded("", []);
  };
  const clearAllFiles = () => {
    setSelectedFiles([]);
    setUploadErrors([]);
    setUploadSuccess([]);
    onFilesUploaded && onFilesUploaded("", []);
  };

  // --- Drag & Drop ---
  const handleDragEnter = e => { e.preventDefault(); e.stopPropagation(); setDragCounter(prev => prev+1); if (e.dataTransfer.items?.length) { setHover(true); setDraggedFileName(e.dataTransfer.items[0].getAsFile()?.name || ""); } };
  const handleDragLeave = e => { e.preventDefault(); e.stopPropagation(); setDragCounter(prev => { const val = prev-1; if(val===0){ setHover(false); setDraggedFileName(""); } return val; }); };
  const handleDragOver = e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; };
  const handleDrop = e => { e.preventDefault(); e.stopPropagation(); setHover(false); setDragCounter(0); if(e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); };
  const handleFileSelect = e => { if(e.target.files?.length) handleFiles(e.target.files); e.target.value=""; };

  React.useEffect(() => {
    const handleGlobalDrop = e => { if(!dropzoneRef.current?.contains(e.target)) { e.preventDefault(); e.stopPropagation(); } };
    const handleGlobalDragOver = e => { if(!dropzoneRef.current?.contains(e.target)) e.preventDefault(); };
    document.addEventListener("dragover", handleGlobalDragOver); document.addEventListener("drop", handleGlobalDrop);
    return () => { document.removeEventListener("dragover", handleGlobalDragOver); document.removeEventListener("drop", handleGlobalDrop); };
  }, []);

  // --- Render ---
  return (
    <div className="keyness-container">
      {/* Paste textarea */}
      <div>
        <label className="block text-lg font-semibold mb-2">Paste Your Text</label>
        <textarea value={pastedText} onChange={handleTextPaste} className="keyness-textarea" placeholder="Paste text here..."
          style={{ width:"100%", minHeight:"120px", padding:"12px", border:"1px solid #ccc", borderRadius:"6px", fontSize:"14px", fontFamily:"monospace", resize:"vertical" }} />
        {pastedText && <div style={{ fontSize:"0.9em", color:"#666", marginTop:"6px" }}>Word count: {pastedWordCount}</div>}
      </div>

      {/* Drag & Drop */}
      <div ref={dropzoneRef} className={`keyness-dropzone ${hover?"hover":""} ${uploading?"uploading":""}`}
           onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
           style={{ width:"100%", border: uploading?"2px solid #007bff":"2px dashed #ccc", padding:"40px 20px", textAlign:"center", borderRadius:"8px", backgroundColor: hover || uploading ? "#f0f8ff":"transparent" }}>
        <div style={{ pointerEvents:"none" }}>
          {uploading ? (<div><Upload className="animate-pulse mx-auto mb-2" size={24} />Uploading…</div>) :
            <>Drag & drop files here {hover && draggedFileName && <div>Release to upload: <strong>{draggedFileName}</strong></div>}
              <div style={{ fontSize:"0.9em", color:"#666", marginTop:"8px" }}>Supported: .txt, .doc, .docx (max 5MB each)</div>
            </>}
        </div>
        <input id="fileInput" type="file" multiple style={{ display:"none" }} onChange={handleFileSelect} accept=".txt,.doc,.docx" disabled={uploading} />
      </div>

      {/* Select files button */}
      <button type="button" onClick={()=>!uploading && document.getElementById("fileInput").click()}
              style={{ marginTop:"10px", padding:"6px 12px", background:"#007bff", color:"white", border:"none", borderRadius:"4px", cursor: uploading?"not-allowed":"pointer" }}>Select Files</button>

      {/* Upload messages */}
      {uploadSuccess.length>0 && <div style={{ backgroundColor:"#d1f2eb", padding:"12px", borderRadius:"6px", marginTop:"12px" }}>{uploadSuccess.map((msg,i)=><div key={i} style={{ color:"#389e0d", marginBottom:"4px" }}>{msg}</div>)}</div>}
      {uploadErrors.length>0 && <div style={{ backgroundColor:"#fff2f0", padding:"12px", borderRadius:"6px", marginTop:"12px" }}>{uploadErrors.map((err,i)=><div key={i} style={{ color:"#cf1322", marginBottom:"4px" }}><AlertCircle size={16} style={{ marginRight:"6px" }} />{err}</div>)}</div>}

      {/* Selected Files */}
{selectedFiles.length > 0 && (
  <div
    className="keyness-file-list"
    style={{
      width: "100%",
      padding: "16px",
      backgroundColor: "#f8f9fa",
      borderRadius: "6px",
      border: "1px solid #e9ecef",
      marginTop: "12px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
      }}
    >
      <h4 style={{ margin: 0, color: "#495057" }}>Selected Files:</h4>
      <button
        onClick={clearAllFiles}
        style={{
          background: "none",
          border: "none",
          color: "#6c757d",
          cursor: "pointer",
          fontSize: "0.9em",
        }}
      >
        Clear All
      </button>
    </div>

    {selectedFiles.map((file, index) => (
      <div
        key={`${file.name}-${index}`}
        style={{
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {file.processed && <CheckCircle size={16} color="green" />}
            <span>
              {file.name} ({Math.round(file.size / 1024)}KB)
              {file.processed && file.wordCount && (
                <span style={{ color: "#6c757d", fontSize: "0.9em" }}>
                  {" "}
                  • {file.wordCount} words
                </span>
              )}
            </span>
          </div>
          <button
            onClick={() => removeFile(index)}
            style={{
              background: "none",
              border: "none",
              color: "#dc3545",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Individual Progress Bar */}
        {!file.processed && (
          <div
            style={{
              height: "6px",
              borderRadius: "3px",
              background: "#e9ecef",
              marginTop: "6px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${file.uploadProgress || 0}%`,
                height: "100%",
                background: "#007bff",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        )}
      </div>
    ))}
  </div>
)}

      {/* Uploaded Preview */}
      {selectedFiles.some(f=>f.processed) &&
        <div style={{ width:"100%", padding:"16px", backgroundColor:"#f8f9fa", borderRadius:"6px", border:"1px solid #e9ecef", marginTop:"12px" }}>
          <h3 style={{ marginBottom:"12px", color:"#495057" }}>Uploaded Text Preview:</h3>
          <pre style={{ whiteSpace:"pre-wrap", maxHeight:"200px", overflow:"auto", backgroundColor:"#ffffff", padding:"12px", borderRadius:"4px", border:"1px solid #dee2e6", fontSize:"13px", fontFamily:"monospace", margin:0 }}>
            {selectedFiles.filter(f=>f.processed).map(f=>f.previewText).join("\n\n--- Next File ---\n\n")}
          </pre>
        </div>
      }

      {/* Corpus Preview */}
      {corpusPreview && <div style={{ width:"100%", padding:"16px", backgroundColor:"#f8f9fa", borderRadius:"6px", border:"1px solid #e9ecef", marginTop:"12px" }}>
        <h3 style={{ marginBottom:"12px", color:"#495057" }}>Corpus Preview:</h3>
        <pre style={{ whiteSpace:"pre-wrap", maxHeight:"200px", overflow:"auto", backgroundColor:"#ffffff", padding:"12px", borderRadius:"4px", border:"1px solid #dee2e6", fontSize:"13px", fontFamily:"monospace", margin:0 }}>
          {corpusPreview}
        </pre>
      </div>}

      {/* General error */}
      {error && <div style={{ width:"100%", color:"#dc3545", padding:"12px", backgroundColor:"#f8d7da", border:"1px solid #f5c6cb", borderRadius:"6px", marginTop:"12px" }}>{error}</div>}
    </div>
  );
};

export default TextInputSection;
