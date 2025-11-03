// client/src/pages/student/CertificatePage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useGetAttemptQuery } from "@/features/api/testApi";
import { toast } from "sonner";

/**
 * Certificate page:
 * - fetches attempt metadata via RTK Query (useGetAttemptQuery)
 * - if attempt.certificateUrl exists, requests server proxy endpoint with credentials included
 * - converts response to blob and creates object URL for iframe viewing
 */
const CertificatePage = () => {
  const { attemptId } = useParams();
  const { data, isLoading, isError } = useGetAttemptQuery(attemptId);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadingCert, setLoadingCert] = useState(false);

  // cleanup blobUrl on unmount/change
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  useEffect(() => {
    if (!data?.attempt || !data.attempt.certificateUrl) return;

    const fetchCertificateViaProxy = async () => {
      setLoadingCert(true);
      try {
        // backend base (defaults to http://localhost:5000/api/v1)
        const backendBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";
        const proxyUrl = `${backendBase}/test/attempt/${data.attempt._id}/certificate`;

        const resp = await fetch(proxyUrl, {
          method: "GET",
          // IMPORTANT: include credentials so server-side cookie auth / session works
          credentials: "include",
          headers: {
            Accept: "application/pdf, application/octet-stream",
          },
        });

        if (!resp.ok) {
          // Attempt to read JSON or text for more info
          let info = "";
          try {
            info = await resp.json();
          } catch {
            try {
              info = await resp.text();
            } catch {}
          }
          console.error("Certificate proxy fetched with error:", resp.status, resp.statusText, info);
          toast.error(`Failed to load certificate (${resp.status})`);
          setLoadingCert(false);
          return;
        }

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);

        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setBlobUrl(url);
      } catch (err) {
        console.error("Failed to fetch certificate via proxy:", err);
        toast.error("Failed to load certificate");
      } finally {
        setLoadingCert(false);
      }
    };

    fetchCertificateViaProxy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.attempt]);

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Failed to load attempt.</p>;
  if (!data?.attempt) return <p>Attempt not found</p>;

  const attempt = data.attempt;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Test Result</h1>
      <p>Score: {attempt.totalObtained}</p>
      <p>Passed: {attempt.passed ? "Yes" : "No"}</p>

      {attempt.certificateUrl ? (
        <div className="mt-4">
          <h2 className="font-semibold">Certificate</h2>

          {loadingCert ? (
            <p>Loading certificate...</p>
          ) : blobUrl ? (
            <>
              <a href={blobUrl} target="_blank" rel="noreferrer" className="text-blue-600">
                View Certificate
              </a>
              <iframe
                src={blobUrl}
                title="certificate"
                className="w-full h-[600px] mt-4 border"
              />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Could not load certificate via proxy. You can try opening the direct link (may be blocked).
              </p>
              <a href={attempt.certificateUrl} target="_blank" rel="noreferrer" className="text-blue-600">
                Open certificate (direct)
              </a>
            </>
          )}
        </div>
      ) : (
        <p className="mt-4">No certificate available.</p>
      )}
    </div>
  );
};

export default CertificatePage;
