  let currentFeed = null;
        let serviceIndex = null;
        let pendingDownload = null; // Store download info when modal is shown
        
        // Show download modal
        function showDownloadModal(packageId, version) {
            pendingDownload = { packageId, version };
            const modal = document.getElementById('downloadModal');
            modal.classList.add('show');
        }

        // Close download modal
        function closeDownloadModal() {
            const modal = document.getElementById('downloadModal');
            modal.classList.remove('show');
            pendingDownload = null;
        }

        // Proceed with download after modal confirmation
        function proceedWithDownload() {
            if (pendingDownload) {
                downloadPackage(pendingDownload.packageId, pendingDownload.version);
                closeDownloadModal();
            }
        }

        // Close modal when clicking outside
        document.getElementById('downloadModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeDownloadModal();
            }
        });

        // Handle Enter key in search box
        function handleSearchKeyPress(event) {
            if (event.key === 'Enter') {
                searchPackages();
            }
        }
        
        // Connect to NuGet feed
        async function connectToFeed() {
            const feedUrl = $('#feedUrl').val().trim();
            if (!feedUrl) {
                showError('Please enter a feed URL');
                return;
            }
            
            // Show loading state
            $('#connectSpinner').show();
            $('#connectText').text('Connecting...');
            
            $('#feedStatus').html('<div class="status-message loading"><div class="spinner"></div>Connecting to feed...</div>');
            
            try {
                const response = await fetch(feedUrl, {
                    method: 'GET',
                    credentials: 'omit', // Don't send cookies
                    cache: 'no-cache'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                serviceIndex = await response.json();
                currentFeed = feedUrl;
                
                showSuccess('✅ Connected to feed successfully!');
                console.log('Service Index:', serviceIndex);
                
                // Auto-load all packages after successful connection
                loadAllPackages();
                
            } catch (error) {
                console.error('Feed connection error:', error);
                showError(`❌ Failed to connect to feed: ${error.message}`);
                currentFeed = null;
                serviceIndex = null;
            } finally {
                // Reset button state
                $('#connectSpinner').hide();
                $('#connectText').text('Connect');
            }
        }
        
        // Load all packages from feed
        async function loadAllPackages() {
            if (!serviceIndex) {
                showError('Please connect to a feed first');
                return;
            }
            
            // Find search service URL from service index
            const searchService = serviceIndex.resources.find(r => 
                r['@type'] === 'SearchQueryService' || 
                r['@type'].includes('SearchQueryService')
            );
            
            if (!searchService) {
                showError('Search service not available in this feed');
                return;
            }
            
            $('#results').html('<div class="status-message loading"><div class="spinner"></div>Loading all packages...</div>');
            
            try {
                // Search with empty query to get all packages
                const searchUrl = `${searchService['@id']}?q=&take=100&prerelease=false`;
                console.log('Load All URL:', searchUrl);
                
                const response = await fetch(searchUrl, {
                    method: 'GET',
                    credentials: 'omit', // Don't send cookies
                    cache: 'no-cache'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const searchResults = await response.json();
                displayPackages(searchResults.data || []);
                
            } catch (error) {
                console.error('Load all packages error:', error);
                showError(`Failed to load packages: ${error.message}`);
            }
        }
        
        // Search for packages (now acts as filter)
        async function searchPackages() {
            const query = $('#searchQuery').val().trim();
            
            if (!serviceIndex) {
                showError('Please connect to a feed first');
                return;
            }
            
            // Find search service URL from service index
            const searchService = serviceIndex.resources.find(r => 
                r['@type'] === 'SearchQueryService' || 
                r['@type'].includes('SearchQueryService')
            );
            
            if (!searchService) {
                showError('Search service not available in this feed');
                return;
            }
            
            $('#results').html('<div class="status-message loading"><div class="spinner"></div>Filtering packages...</div>');
            
            try {
                // Use query if provided, otherwise empty to get all
                const searchUrl = `${searchService['@id']}?q=${encodeURIComponent(query)}&take=100&prerelease=false`;
                console.log('Filter URL:', searchUrl);
                
                const response = await fetch(searchUrl, {
                    method: 'GET',
                    credentials: 'omit', // Don't send cookies
                    cache: 'no-cache'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const searchResults = await response.json();
                displayPackages(searchResults.data || []);
                
            } catch (error) {
                console.error('Filter error:', error);
                showError(`Filter failed: ${error.message}`);
            }
        }
        
        // Display search results
        function displayPackages(packages) {
            if (!packages || packages.length === 0) {
                $('#results').html(`
                    <div class="no-results">
                        <div class="no-results-icon">📦</div>
                        <h3>No packages found</h3>
                        <p>Try a different search term or check your feed connection.</p>
                    </div>
                `);
                return;
            }
            
            let html = '<div class="package-list">';
            
            packages.forEach(pkg => {
                const latestVersion = pkg.version || (pkg.versions && pkg.versions[pkg.versions.length - 1]?.version) || 'Unknown';
                const description = pkg.description || 'No description available';
                const authors = pkg.authors || 'Unknown';
                const packageTitle = pkg.title || pkg.id || pkg.packageId || '';
                const packageId = pkg.id || pkg.packageId || '';
                
                html += `
                    <div class="package-item">
                        <div class="package-header">
                            <h4 class="package-name">${escapeHtml(packageTitle)}</h4>
                            <span class="package-version">v${escapeHtml(latestVersion)}</span>
                        </div>
                        <div class="package-description">${escapeHtml(description)}</div>
                        <div class="package-actions">
                            <button class="btn btn-success" onclick="showDownloadModal('${escapeHtml(packageId)}', '${escapeHtml(latestVersion)}')">
                                📥 Download v${escapeHtml(latestVersion)}
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            $('#results').html(html);
        }
        
        // Download package using fetch without cookies
        async function downloadPackage(packageId, version) {
            if (!serviceIndex) {
                showError('No feed connected');
                return;
            }
            
            // Find package content service
            const contentService = serviceIndex.resources.find(r => 
                r['@type'] === 'PackageBaseAddress/3.0.0' || 
                r['@type'].includes('PackageBaseAddress')
            );
            
            if (!contentService) {
                showError('Package download service not available');
                return;
            }
            
            try {
                // NuGet package download URL format
                const downloadUrl = `${contentService['@id']}${packageId.toLowerCase()}/${version.toLowerCase()}/${packageId.toLowerCase()}.${version.toLowerCase()}.nupkg`;
                console.log('Download URL:', downloadUrl);
                
                showSuccess(`🔄 Initiating download for ${packageId} v${version}...`);
                
                // Use fetch to download without cookies, then create blob URL
                const response = await fetch(downloadUrl, {
                    method: 'GET',
                    credentials: 'omit', // Don't send cookies
                    cache: 'no-cache'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                
                // Create temporary download link
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${packageId}.${version}.nupkg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up blob URL
                setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
                
                showSuccess(`✅ Download completed for ${packageId} v${version}`);
                
            } catch (error) {
                console.error('Download error:', error);
                showError(`❌ Download failed: ${error.message}`);
            }
        }
        
        // Clear search results
        function clearResults() {
            $('#results').empty();
            $('#searchQuery').val('');
            if (currentFeed && serviceIndex) {
                loadAllPackages();
            }
        }
        
        // Utility functions
        function showError(message) {
            $('#feedStatus').html(`<div class="status-message error">${escapeHtml(message)}</div>`);
        }
        
        function showSuccess(message) {
            $('#feedStatus').html(`<div class="status-message success">${escapeHtml(message)}</div>`);
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Don't auto-connect on page load anymore - user must click Connect button
        $(document).ready(function() {
            console.log('EOS Solutions NuGet Client loaded');
            // Auto-load the preconfigured feed
            connectToFeed();
        });