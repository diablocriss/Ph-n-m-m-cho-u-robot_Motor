// Khởi tạo biến toàn cục
let stepCount = 8;
let timeCount = 10;
let servoCount = 1;
let stepperCount = 1;
let selectedPoint = { chartId: null, seriesIndex: null, pointIndex: null };

// Thêm object để lưu trữ các biểu đồ
const servoCharts = {};

const initialData = {
    "Step 1": [2.22, 2.20, 2.44, 2.45, 2.58, 2.44, 2.40, 2.72, 2.66, 3.04],
    "Step 2": [3.86, 3.76, 3.77, 3.65, 3.90, 3.88, 3.69, 3.86, 3.38, 4.20],
    "Step 3": [4.37, 4.27, 4.72, 4.87, 5.35, 5.50, 4.84, 4.13, 5.22, 5.39],
    "Step 4": [6.64, 6.31, 6.59, 6.95, 7.16, 6.40, 7.20, 7.17, 6.95, 7.09],
    "Step 5": [8.00, 6.81, 6.71, 6.82, 6.56, 6.24, 5.40, 7.01, 7.14, 8.11],
    "Step 6": [7.94, 7.29, 7.28, 7.82, 7.89, 6.71, 7.80, 7.60, 7.66, 8.89],
    "Step 7": [10.11, 9.27, 9.25, 10.17, 10.72, 10.24, 12.07, 7.60, 7.66, 8.89],
    "Step 8": [11.76, 10.29, 12.02, 11.80, 12.48, 13.61, 12.07, 7.60, 7.66, 8.89]
};

// Thiết lập kết nối WebSocket
const socket = new WebSocket(`ws://${window.location.hostname}/ws`);
const connectionStatus = document.getElementById('connectionStatus');

function setupStepperEventListeners(motorNum = 1) {
    const loadButton = document.getElementById(`Load${motorNum}`);
    const homeButton = document.getElementById(`homeButton${motorNum}`);
    
    if (loadButton) {
        loadButton.addEventListener('click', function() {
            const from = document.getElementById(`from${motorNum}`).value;
            const to = document.getElementById(`to${motorNum}`).value;
            const rpm = document.getElementById(`Set_PRM${motorNum}`).value;
            const type = document.getElementById(`type${motorNum}`).value;
            
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    CMD: "move",
                    motor: "stepper",
                    id: motorNum,
                    from: from,
                    to: to,
                    rpm: rpm,
                    type: type
                }));
            }
        });
    }
    
    if (homeButton) {
        homeButton.addEventListener('click', function() {
            HOME(motorNum);
        });
    }
}

// Hàm cập nhật biểu đồ
function updateChart(chartId = 'chartContainer') {
    const chart = servoCharts[chartId];
    const motorNum = chartId.replace('chartContainer', '') || '1';
    const stepSelect = document.getElementById(`StepSelect${motorNum}`);
    const timeSelect = document.getElementById(`TimeSelect${motorNum}`);

    if (!chart) return;

    // Lưu giá trị đang chọn
    const selectedStep = stepSelect ? parseInt(stepSelect.value) : 0;
    const selectedTime = timeSelect ? parseInt(timeSelect.value) : 0;

    // Xóa dữ liệu cũ và thêm lại
    chart.options.data = [];
    
    let maxValue = 15;
    
    // Thêm các bước từ initialData
    Object.keys(initialData).forEach(stepKey => {
        const stepData = initialData[stepKey].slice(0, timeCount).map((value, index) => ({
            label: `Thời điểm ${index + 1}`,
            y: value
        }));
        
        const currentMax = Math.max(...initialData[stepKey].slice(0, timeCount));
        if (currentMax > maxValue) maxValue = currentMax;
        
        chart.options.data.push({
            type: "spline",
            visible: true,
            showInLegend: true,
            name: stepKey,
            dataPoints: stepData
        });
    });

    // Thêm highlight sau khi đã có dữ liệu
    if (chart.options.data[selectedStep] && chart.options.data[selectedStep].dataPoints[selectedTime]) {
        const point = chart.options.data[selectedStep].dataPoints[selectedTime];
        point.markerType = "circle";
        point.markerSize = 10;
        point.markerColor = "red";
        point.markerBorderColor = "darkred";
        point.markerBorderThickness = 2;
    }

    chart.options.axisY.maximum = Math.ceil(maxValue * 1.1);
    chart.render();
    updateStatusPanel(chartId);
}

// Hàm chuyển đổi hiển thị dữ liệu
function toggleDataSeries(e) {
    // Chỉ xử lý khi click chuột phải hoặc sự kiện đặc biệt
    if (e.event && e.event.type === "contextmenu") {
        const chartId = Object.keys(servoCharts).find(key => 
            servoCharts[key] === e.chart
        );
        
        if (chartId) {
            if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                e.dataSeries.visible = false;
            } else {
                e.dataSeries.visible = true;
            }
            servoCharts[chartId].render();
        }
    }
}

function updateTimeDropdown(chartId = 'chartContainer') {
    const motorNum = chartId.replace('chartContainer', '') || '1';
    const timeSelect = document.getElementById(`TimeSelect${motorNum}`);
    if (!timeSelect) return;

    // Lưu giá trị đang chọn
    const selectedValue = parseInt(timeSelect.value);
    
    // Xóa tất cả options hiện có
    timeSelect.innerHTML = '';
    
    // Thêm options mới dựa trên timeCount
    for (let i = 1; i <= timeCount; i++) {
        const option = document.createElement('option');
        option.value = i - 1;
        option.textContent = `Time ${i}`;
        timeSelect.appendChild(option);
    }
    
    // Logic chọn lại giá trị thông minh
    if (timeCount > 0) {
        // Nếu giá trị đang chọn vẫn tồn tại, giữ nguyên
        if (selectedValue < timeCount) {
            timeSelect.value = selectedValue;
        } 
        // Nếu giá trị đang chọn là item cuối đã bị xóa, chọn item cuối mới
        else {
            timeSelect.value = timeCount - 1;
        }
    }
}

function updateStepDropdown(chartId = 'chartContainer') {
    const motorNum = chartId.replace('chartContainer', '') || '1';
    const stepSelect = document.getElementById(`StepSelect${motorNum}`);
    if (!stepSelect) return;

    // Lưu giá trị đang chọn
    const selectedValue = parseInt(stepSelect.value);
    
    // Xóa tất cả options hiện có
    stepSelect.innerHTML = '';
    
    // Thêm options mới dựa trên stepCount
    for (let i = 1; i <= stepCount; i++) {
        const option = document.createElement('option');
        option.value = i - 1;
        option.textContent = `Step ${i}`;
        stepSelect.appendChild(option);
    }
    
    // Logic chọn lại giá trị thông minh
    if (stepCount > 0) {
        // Nếu giá trị đang chọn vẫn tồn tại, giữ nguyên
        if (selectedValue < stepCount) {
            stepSelect.value = selectedValue;
        } 
        // Nếu giá trị đang chọn là item cuối đã bị xóa, chọn item cuối mới
        else {
            stepSelect.value = stepCount - 1;
        }
    }
}


// Hàm thêm motor mới
function addNewMotorTab() {
    const motorType = document.getElementById('motorTypeSelect').value;
    const tabList = document.getElementById('myTab');
    const tabContent = document.getElementById('myTabContent');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('addMotorModal'));
    modal.hide();
    
    if (motorType === 'servo') {
        servoCount++;
        const newTabId = `servo${servoCount}`;
        const chartId = `chartContainer${servoCount}`;
        
        // Thêm tab mới
        const newTab = document.createElement('li');
        newTab.className = 'nav-item';
        newTab.innerHTML = `
            <button class="nav-link" id="${newTabId}-tab" data-bs-toggle="tab" 
                    data-bs-target="#${newTabId}" type="button" role="tab">
                Servo Motor ${servoCount}
            <span class="tab-close-btn" onclick="removeTab(event, '${newTabId}')">×</span>
            </button>
        `;
        tabList.insertBefore(newTab, document.getElementById('add-tab').parentNode);
        
        // Thêm nội dung tab (giống hệt tab mặc định)
        const newTabContent = document.createElement('div');
        newTabContent.className = 'tab-pane fade';
        newTabContent.id = newTabId;
        newTabContent.innerHTML = `
            <div class="row">
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header">
                            Servo Motor ${servoCount} Position Control
                        </div>
                        <div class="card-body">
                            <div id="${chartId}"></div>
                            
                            <div class="control-panel">
                                <h5>Time Control</h5>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Step Selection</label>
                                        <div class="input-group">
                                            <select id="StepSelect${servoCount}" class="form-select">
                                                <option value="0">Step 1</option>
                                                <option value="1">Step 2</option>
                                                <option value="2">Step 3</option>
                                                <option value="3">Step 4</option>
                                                <option value="4">Step 5</option>
                                                <option value="5">Step 6</option>
                                                <option value="6">Step 7</option>
                                                <option value="7">Step 8</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Time Selection</label>
                                        <div class="input-group">
                                            <select id="TimeSelect${servoCount}" class="form-select">
                                                <option value="0">Time 1</option>
                                                <option value="1">Time 2</option>
                                                <option value="2">Time 3</option>
                                                <option value="3">Time 4</option>
                                                <option value="4">Time 5</option>
                                                <option value="5">Time 6</option>
                                                <option value="6">Time 7</option>
                                                <option value="7">Time 8</option>
                                                <option value="8">Time 9</option>
                                                <option value="9">Time 10</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="slider-container">
                                    <div class="row mb-3">
                                        <div class="col-md-3">
                                            <label class="form-label">Min Degree</label>
                                            <input type="number" id="minDegreeInput${servoCount}" class="form-control" value="0" step="0.1">
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Max Degree</label>
                                            <input type="number" id="maxDegreeInput${servoCount}" class="form-control" value="360" step="0.1">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Current Position: <span id="sliderValue${servoCount}" class="slider-value">0</span>°</label>
                                            <input type="range" min="0" max="360" value="0" step="0.1" class="slider" id="mainSlider${servoCount}">
                                        </div>
                                    </div>
                                </div>
                                
                                <button id="exportButton${servoCount}" class="btn btn-primary">Export Data to Terminal</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-4">
                    <div class="card">
                        <div class="card-header">
                            Servo Motor Status
                        </div>
                        <div class="card-body">
                            <table class="data-table">
                                <tbody>
                                    <tr>
                                        <th>Current Step</th>
                                        <td id="currentStep${servoCount}">-</td>
                                    </tr>
                                    <tr>
                                        <th>Current Time</th>
                                        <td id="currentTime${servoCount}">-</td>
                                    </tr>
                                    <tr>
                                        <th>Current Position</th>
                                        <td id="currentPosition${servoCount}">-</td>
                                    </tr>
                                    <tr>
                                        <th>Min Position</th>
                                        <td id="minPosition${servoCount}">-</td>
                                    </tr>
                                    <tr>
                                        <th>Max Position</th>
                                        <td id="maxPosition${servoCount}">-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        tabContent.appendChild(newTabContent);
        
        // Khởi tạo biểu đồ cho tab mới
        initializeServoChart(chartId);
        
        // Kích hoạt tab mới
        new bootstrap.Tab(document.getElementById(`${newTabId}-tab`)).show();
        
        // Thêm sự kiện cho tab mới
        setupEventListenersForNewTab(servoCount);
    } else if (motorType === 'stepper') {
                stepperCount++;
                const newTabId = `stepper${stepperCount}`;
                
                // Thêm tab mới
                const newTab = document.createElement('li');
                newTab.className = 'nav-item';
                newTab.innerHTML = `
                    <button class="nav-link" id="${newTabId}-tab" data-bs-toggle="tab" 
                            data-bs-target="#${newTabId}" type="button" role="tab">
                        Stepper Motor ${stepperCount}
                        <span class="tab-close-btn" onclick="removeTab(event, '${newTabId}')">×</span>
                    </button>
                `;
                tabList.insertBefore(newTab, document.getElementById('add-tab').parentNode);
                
                // Thêm nội dung tab Stepper Motor
                const newTabContent = document.createElement('div');
                newTabContent.className = 'tab-pane fade';
                newTabContent.id = newTabId;
                newTabContent.innerHTML = `
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="card">
                                <div class="card-header">
                                    Stepper Motor ${stepperCount} Control
                                </div>
                                <div class="card-body">
                                    <div class="control-panel">
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="form-label">From Position</label>
                                                <input type="number" id="from${stepperCount}" class="form-control" value="0">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">To Position</label>
                                                <input type="number" id="to${stepperCount}" class="form-control" value="2100">
                                            </div>
                                        </div>
                                        
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Set RPM</label>
                                                <input type="number" id="Set_PRM${stepperCount}" class="form-control" value="20">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Type</label>
                                                <select id="type${stepperCount}" class="form-select">
                                                    <option value="0">Type 0</option>
                                                    <option value="1">Type 1</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="d-flex justify-content-between mb-4">
                                            <button id="Load${stepperCount}" class="btn btn-primary" onclick="LoadData(${stepperCount})">Load Data</button>
                                            <button id="homeButton${stepperCount}" class="btn btn-secondary" onclick="HOME(${stepperCount})">Home Position</button>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label class="form-label">Progress</label>
                                            <div class="progress">
                                                <div id="progressBar${stepperCount}" class="progress-bar" role="progressbar" style="width: 0%"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-lg-6">
                            <div class="card">
                                <div class="card-header">
                                    Stepper Motor Status
                                </div>
                                <div class="card-body">
                                    <table class="data-table">
                                        <tbody>
                                            <tr>
                                                <th>Steps Completed</th>
                                                <td id="steps_completed${stepperCount}">-</td>
                                            </tr>
                                            <tr>
                                                <th>Current Angle</th>
                                                <td id="current_angle${stepperCount}">-</td>
                                            </tr>
                                            <tr>
                                                <th>Direction</th>
                                                <td id="direction${stepperCount}">-</td>
                                            </tr>
                                            <tr>
                                                <th>Current RPM</th>
                                                <td id="current_rpm${stepperCount}">-</td>
                                            </tr>
                                            <tr>
                                                <th>Target RPM</th>
                                                <td id="target_rpm${stepperCount}">-</td>
                                            </tr>
                                            <tr>
                                                <th>From Step</th>
                                                <td id="from_step${stepperCount}">-</td>
                                            </tr>
                                            <tr>
                                                <th>To Step</th>
                                                <td id="to_step${stepperCount}">-</td>
                                            </tr>
                                            <tr>
                                                <th>Motor Steps</th>
                                                <td id="motor_steps${stepperCount}">-</td>
                                            </tr>
                                            <tr>
                                                <th>Microsteps</th>
                                                <td id="microsteps${stepperCount}">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                tabContent.appendChild(newTabContent);
                
                // Kích hoạt tab mới
                new bootstrap.Tab(document.getElementById(`${newTabId}-tab`)).show();
                
                // Thêm sự kiện cho tab mới
                setupStepperEventListeners(stepperCount);
            }
}


function initializeServoChart(chartId = 'chartContainer') {
    if (!document.getElementById(chartId)) return;

    servoCharts[chartId] = new CanvasJS.Chart(chartId, {
        theme: "light2",
        animationEnabled: true,
        title: {
            text: "Vị trí Servo Motor",
            fontSize: 16
        },
        axisX: {
            title: "Time Points",
            interval: 1,
            labelFontSize: 10
        },
        axisY: {
            title: "Position (Degrees)",
            suffix: "°",
            minimum: 0,
            maximum: 15
        },
        interactivityEnabled: true,
        dataPointMaxWidth: 20, // Tăng kích thước vùng click
        click: function(e) {
            handleChartClick(e, chartId);
        },

        data: [],
        interactivityEnabled: true,
        toolTip: {
            shared: false,
            content: function(e) {
                if (e.entries && e.entries.length) {
                    const dataPoint = e.entries[0].dataPoint;
                    return `<strong>${e.entries[0].dataSeries.name}</strong><br/>
                            ${dataPoint.label}<br/>
                            Vị trí: ${dataPoint.y.toFixed(2)}°`;
                }
                return "";
            }
        },
        
        highlightEnabled: true, // Bật highlight
        highlight: {
            borderColor: "red", // Màu viền khi highlight
            borderThickness: 2, // Độ dày viền
            color: "transparent" // Màu nền trong suốt để chỉ highlight viền
        },

        dataPointMouseOver: function(e) {
            // Highlight point on hover
            if (e.dataPoint) {
                e.dataPoint.highlight = true;
                e.chart.render();
            }
        },
        dataPointMouseOut: function(e) {
            // Remove highlight when mouse leaves
            if (e.dataPoint) {
                delete e.dataPoint.highlight;
                e.chart.render();
            }
        }
    });

    // Thêm sự kiện click chuột phải
    document.getElementById(chartId).addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showContextMenu(e, chartId);
    });

    // Thêm sự kiện click chuột trái
    servoCharts[chartId].options.click = function(e) {
        handleChartClick(e, chartId);
    };

    updateChart(chartId);
    updateStepDropdown(chartId);
    updateTimeDropdown(chartId);

    // Thêm dòng này để cập nhật slider khi khởi tạo
    updateSliderFromDropdown(chartId);

    setTimeout(() => {
        servoCharts[chartId].render();
    }, 200);
}

function handleChartClick(e, chartId) {
    if (!e.dataPoint || !e.dataSeries) return;
    
    e.event.preventDefault();
    e.event.stopPropagation();

    const motorNum = chartId.replace('chartContainer', '') || '1';
    const stepSelect = document.getElementById(`StepSelect${motorNum}`);
    const timeSelect = document.getElementById(`TimeSelect${motorNum}`);
    const slider = document.getElementById(`mainSlider${motorNum}`);
    const sliderValue = document.getElementById(`sliderValue${motorNum}`);
    const minDegreeInput = document.getElementById(`minDegreeInput${motorNum}`);
    const maxDegreeInput = document.getElementById(`maxDegreeInput${motorNum}`);

    // Get clicked point info
    const stepName = e.dataSeries.name;
    const stepIndex = parseInt(stepName.replace('Step ', '')) - 1;
    const timeIndex = e.dataPointIndex;
    let value = e.dataPoint.y;

    // Apply min/max constraints if they exist
    if (minDegreeInput && maxDegreeInput) {
        const min = parseFloat(minDegreeInput.value);
        const max = parseFloat(maxDegreeInput.value);
        value = Math.max(min, Math.min(max, value));
    }

    // Update UI
    if (stepSelect) stepSelect.value = stepIndex;
    if (timeSelect) timeSelect.value = timeIndex;
    if (slider) {
        slider.value = value;
        // Trigger input event to update all dependent elements
        const event = new Event('input');
        slider.dispatchEvent(event);
    }
    if (sliderValue) sliderValue.textContent = value.toFixed(2);

    // Update data
    initialData[stepName][timeIndex] = value;
    
    // Render chart and update status
    servoCharts[chartId].render();
    updateChart(chartId);
    updateStatusPanel(chartId);
}

function highlightDataPoint(chartId, seriesIndex, pointIndex) {
    const chart = servoCharts[chartId];
    if (!chart) return;
    
    // Xóa tất cả highlight hiện có
    clearAllHighlights(chartId);
    
    // Nếu có chỉ số hợp lệ thì thêm highlight mới
    if (seriesIndex !== null && pointIndex !== null &&
        chart.options.data[seriesIndex] && 
        chart.options.data[seriesIndex].dataPoints[pointIndex]) {
        
        const point = chart.options.data[seriesIndex].dataPoints[pointIndex];
        point.markerType = "circle";
        point.markerSize = 10;
        point.markerColor = "red";
        point.markerBorderColor = "darkred";
        point.markerBorderThickness = 2;
    }
    
    chart.render();
}

// Hàm xóa tất cả highlight
function clearAllHighlights(chartId) {
    const chart = servoCharts[chartId];
    if (!chart) return;
    
    chart.options.data.forEach(series => {
        series.dataPoints.forEach(point => {
            delete point.markerType;
            delete point.markerSize;
            delete point.markerColor;
            delete point.markerBorderColor;
            delete point.markerBorderThickness;
        });
    });
    
    // Không cần render ở đây, sẽ render trong hàm gọi
}

function updateSliderConstraints(chartId) {
    const motorNum = chartId.replace('chartContainer', '') || '1';
    const minDegreeInput = document.getElementById(`minDegreeInput${motorNum}`);
    const maxDegreeInput = document.getElementById(`maxDegreeInput${motorNum}`);
    const slider = document.getElementById(`mainSlider${motorNum}`);
    
    if (minDegreeInput && maxDegreeInput && slider) {
        const min = parseFloat(minDegreeInput.value);
        const max = parseFloat(maxDegreeInput.value);
        
        // Update slider attributes
        slider.min = min;
        slider.max = max;
        
        // Ensure current value is within new bounds
        let currentValue = parseFloat(slider.value);
        currentValue = Math.max(min, Math.min(max, currentValue));
        slider.value = currentValue;
        
        // Trigger input event to update display
        const event = new Event('input');
        slider.dispatchEvent(event);
    }
}

// Hàm hiển thị menu ngữ cảnh
function showContextMenu(e, chartId) {
    e.preventDefault();
    
    const chart = servoCharts[chartId];
    if (!chart) return;

    // Lấy vị trí chuột và chuyển đổi thành tọa độ biểu đồ
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const chartRect = document.getElementById(chartId).getBoundingClientRect();
    const chartX = mouseX - chartRect.left;
    const chartY = mouseY - chartRect.top;

    // Tìm điểm dữ liệu gần nhất
    const closestPoint = findClosestDataPoint(chart, chartX, chartY);
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${mouseX}px`;
    menu.style.top = `${mouseY}px`;
    
    let menuItems = `
        <div class="menu-header">Thao tác dữ liệu</div>
    `;

    if (closestPoint) {
        const { dataSeries, dataPoint, dataPointIndex } = closestPoint;
        menuItems += `
            <div class="menu-item" onclick="selectDataPoint('${chartId}', ${dataSeries.index}, ${dataPointIndex})">
                Chọn điểm này (${dataPoint.y.toFixed(2)}°)
            </div>
            <div class="menu-item" onclick="editDataPoint('${chartId}', ${dataSeries.index}, ${dataPointIndex})">
                Sửa giá trị
            </div>
            <div class="menu-divider"></div>
        `;
    }

    menuItems += `
        <div class="menu-item" onclick="addTimePoint('${chartId}')">Thêm thời điểm</div>
        <div class="menu-item" onclick="removeTimePoint('${chartId}')">Xóa thời điểm</div>
        <div class="menu-divider"></div>
        <div class="menu-item" onclick="addStep('${chartId}')">Thêm step</div>
        <div class="menu-item" onclick="removeStep('${chartId}')">Xóa step</div>
        <div class="menu-divider"></div>
        <div class="menu-item" onclick="resetChart('${chartId}')">Đặt lại biểu đồ</div>
    `;

    menu.innerHTML = menuItems;
    document.body.appendChild(menu);

    // Đóng menu khi click ra ngoài
    const closeMenu = () => {
        document.body.removeChild(menu);
        document.removeEventListener('click', closeMenu);
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

function findClosestDataPoint(chart, x, y) {
    let closestPoint = null;
    let minDistance = Infinity;

    // Duyệt qua tất cả các series và điểm dữ liệu
    chart.options.data.forEach((series, seriesIndex) => {
        series.dataPoints.forEach((point, pointIndex) => {
            // Chuyển đổi tọa độ điểm sang tọa độ màn hình
            const pointX = chart.axisX[0].convertValueToPixel(point.x || pointIndex);
            const pointY = chart.axisY[0].convertValueToPixel(point.y);
            
            // Tính khoảng cách từ chuột đến điểm
            const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));
            
            // Nếu gần hơn điểm trước đó, cập nhật
            if (distance < minDistance && distance < 20) { // 20px là ngưỡng click
                minDistance = distance;
                closestPoint = {
                    dataSeries: { ...series, index: seriesIndex },
                    dataPoint: point,
                    dataPointIndex: pointIndex
                };
            }
        });
    });

    return closestPoint;
}

function selectDataPoint(chartId, seriesIndex, pointIndex) {
    const chart = servoCharts[chartId];
    if (!chart) return;

    // Nếu click vào điểm đang chọn thì bỏ chọn
    if (selectedPoint.chartId === chartId && 
        selectedPoint.seriesIndex === seriesIndex && 
        selectedPoint.pointIndex === pointIndex) {
        selectedPoint = { chartId: null, seriesIndex: null, pointIndex: null };
        clearAllHighlights(chartId);
        return;
    }

    // Lưu điểm đang chọn
    selectedPoint = { chartId, seriesIndex, pointIndex };

    const motorNum = chartId.replace('chartContainer', '') || '1';
    const stepSelect = document.getElementById(`StepSelect${motorNum}`);
    const timeSelect = document.getElementById(`TimeSelect${motorNum}`);
    const slider = document.getElementById(`mainSlider${motorNum}`);
    const sliderValue = document.getElementById(`sliderValue${motorNum}`);

    // Cập nhật dropdowns
    if (stepSelect) stepSelect.value = seriesIndex;
    if (timeSelect) timeSelect.value = pointIndex;

    // Cập nhật slider
    const value = chart.options.data[seriesIndex].dataPoints[pointIndex].y;
    if (slider) slider.value = value;
    if (sliderValue) sliderValue.textContent = value.toFixed(2);

    // Highlight điểm được chọn
    highlightDataPoint(chartId, seriesIndex, pointIndex);
    
    // Cập nhật status panel
    updateStatusPanel(chartId);
}

function editDataPoint(chartId, seriesIndex, pointIndex) {
    const chart = servoCharts[chartId];
    if (!chart) return;

    const currentValue = chart.options.data[seriesIndex].dataPoints[pointIndex].y;
    const newValue = prompt("Nhập giá trị mới:", currentValue);
    
    if (newValue !== null && !isNaN(newValue)) {
        const numValue = parseFloat(newValue);
        chart.options.data[seriesIndex].dataPoints[pointIndex].y = numValue;
        
        // Cập nhật initialData
        const stepName = `Step ${seriesIndex + 1}`;
        initialData[stepName][pointIndex] = numValue;
        
        // Cập nhật UI
        selectDataPoint(chartId, seriesIndex, pointIndex);
        chart.render();
    }
}

// Thêm điểm dữ liệu
// Thêm thời điểm mới
function addTimePoint(chartId) {
    const chart = servoCharts[chartId];
    if (!chart) return;

    // Thêm thời điểm vào tất cả các step
    Object.keys(initialData).forEach(step => {
        const lastValue = initialData[step][initialData[step].length - 1];
        initialData[step].push(lastValue || 5); // Sử dụng giá trị cuối cùng hoặc mặc định là 5
    });
    
    timeCount++;
    updateChart(chartId);
    updateTimeDropdown(chartId);
    updateSliderFromDropdown(chartId);
}

// Xóa thời điểm cuối cùng
function removeTimePoint(chartId) {
    if (timeCount <= 1) {
        alert("Phải có ít nhất 1 thời điểm!");
        return;
    }

    // Xóa thời điểm cuối cùng từ tất cả các step
    Object.keys(initialData).forEach(step => {
        initialData[step].pop();
    });
    
    timeCount--;
    updateChart(chartId);
    updateTimeDropdown(chartId);
    updateSliderFromDropdown(chartId);
}

// Thêm step mới
function addStep(chartId) {
    stepCount++;
    const newStepKey = `Step ${stepCount}`;
    initialData[newStepKey] = Array(timeCount).fill(5); // Tạo mảng với giá trị mặc định
    
    updateChart(chartId);
    updateStepDropdown(chartId);
    updateSliderFromDropdown(chartId);
}

// Xóa step cuối cùng
function removeStep(chartId) {
    if (stepCount <= 1) {
        alert("Phải có ít nhất 1 step!");
        return;
    }

    const lastStepKey = `Step ${stepCount}`;
    delete initialData[lastStepKey];
    stepCount--;
    
    updateChart(chartId);
    updateStepDropdown(chartId);
    updateSliderFromDropdown(chartId);
}

function resetChart(chartId) {
    if (confirm('Bạn có chắc muốn đặt lại biểu đồ về trạng thái ban đầu?')) {
        // Khởi tạo lại dữ liệu mặc định
        Object.keys(initialData).forEach(step => {
            initialData[step] = Array(10).fill(5);
        });
        timeCount = 10;
        updateChart(chartId);
    }
}

function setupEventListenersForNewTab(tabIndex) {
    const slider = document.getElementById(`mainSlider${tabIndex}`);
    const sliderValue = document.getElementById(`sliderValue${tabIndex}`);
    const TimeSelect = document.getElementById(`TimeSelect${tabIndex}`);
    const StepSelect = document.getElementById(`StepSelect${tabIndex}`);
    const exportButton = document.getElementById(`exportButton${tabIndex}`);
    const chartId = `chartContainer${tabIndex}`;

    // Trong cả hai hàm setupEventListeners và setupEventListenersForNewTab
        if (slider && sliderValue) {
            slider.oninput = function() {
                const value = parseFloat(this.value);
                sliderValue.textContent = value.toFixed(2);
                
                // Chỉ cập nhật nếu có điểm đang chọn
                if (selectedPoint.chartId && 
                    servoCharts[selectedPoint.chartId] &&
                    servoCharts[selectedPoint.chartId].options.data[selectedPoint.seriesIndex] &&
                    servoCharts[selectedPoint.chartId].options.data[selectedPoint.seriesIndex].dataPoints[selectedPoint.pointIndex]) {
                    
                    // Cập nhật giá trị trong biểu đồ
                    const point = servoCharts[selectedPoint.chartId].options.data[selectedPoint.seriesIndex].dataPoints[selectedPoint.pointIndex];
                    point.y = value;
                    
                    // Cập nhật initialData
                    const stepName = `Step ${selectedPoint.seriesIndex + 1}`;
                    initialData[stepName][selectedPoint.pointIndex] = value;
                    
                    // Render lại biểu đồ (giữ nguyên highlight)
                    servoCharts[selectedPoint.chartId].render();
                }
                
                updateStatusPanel(chartId);
            };
        }
    
            // Trong cả hai hàm setupEventListeners và setupEventListenersForNewTab
        if (TimeSelect) {
            TimeSelect.addEventListener('change', function() {
                updateSliderFromDropdown(chartId);
                updateChart(chartId); // Cập nhật highlight khi thay đổi time
            });
        }

        if (StepSelect) {
            StepSelect.addEventListener('change', function() {
                updateSliderFromDropdown(chartId);
                updateChart(chartId); // Cập nhật highlight khi thay đổi step
            });
        }

            if (exportButton) {
                exportButton.addEventListener('click', function() {
                    const data = servoCharts[chartId].options.data.map(series => ({
                        Step: series.name,
                        Positions: series.dataPoints.map(point => point.y)
                    }));
                    
                    console.log(`Dữ liệu Servo Motor ${tabIndex} đã xuất:`);
                    data.forEach(stepData => {
                        console.log(`${stepData.Step}:`, stepData.Positions);
                    });
                    
                    alert(`Dữ liệu servo motor ${tabIndex} đã được xuất ra console trình duyệt.`);
                });
            }
}

// Thiết lập sự kiện giao diện
function setupEventListeners() {
    const chartId = 'chartContainer';
    // Điều khiển servo motor
    const slider = document.getElementById("mainSlider1");
    const sliderValue = document.getElementById("sliderValue1");
    const TimeSelect = document.getElementById("TimeSelect1");
    const StepSelect = document.getElementById("StepSelect1");
    const exportButton = document.getElementById("exportButton1");

        // In both setupEventListeners and setupEventListenersForNewTab functions:
        // Trong cả hai hàm setupEventListeners và setupEventListenersForNewTab
    if (slider && sliderValue) {
        slider.oninput = function() {
            const value = parseFloat(this.value);
            sliderValue.textContent = value.toFixed(2);
            
            // Chỉ cập nhật nếu có điểm đang chọn
            if (selectedPoint.chartId && 
                servoCharts[selectedPoint.chartId] &&
                servoCharts[selectedPoint.chartId].options.data[selectedPoint.seriesIndex] &&
                servoCharts[selectedPoint.chartId].options.data[selectedPoint.seriesIndex].dataPoints[selectedPoint.pointIndex]) {
                
                // Cập nhật giá trị trong biểu đồ
                const point = servoCharts[selectedPoint.chartId].options.data[selectedPoint.seriesIndex].dataPoints[selectedPoint.pointIndex];
                point.y = value;
                
                // Cập nhật initialData
                const stepName = `Step ${selectedPoint.seriesIndex + 1}`;
                initialData[stepName][selectedPoint.pointIndex] = value;
                
                // Render lại biểu đồ (giữ nguyên highlight)
                servoCharts[selectedPoint.chartId].render();
            }
            
            updateStatusPanel(chartId);
        };
    }                                                                                
  
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            // Lấy biểu đồ mặc định
            const chartId = 'chartContainer';
            const data = servoCharts[chartId].options.data.map(series => ({
                Step: series.name,
                Positions: series.dataPoints.map(point => point.y)
            }));
            
            console.log('Dữ liệu Servo đã xuất:');
            data.forEach(stepData => {
                console.log(`${stepData.Step}:`, stepData.Positions);
            });
            
            alert('Dữ liệu servo motor đã được xuất ra console trình duyệt.');
        });
    }
        // Trong cả hai hàm setupEventListeners và setupEventListenersForNewTab
    if (TimeSelect) {
        TimeSelect.addEventListener('change', function() {
            updateSliderFromDropdown(chartId);
            updateChart(chartId); // Cập nhật highlight khi thay đổi time
        });
    }

    if (StepSelect) {
        StepSelect.addEventListener('change', function() {
            updateSliderFromDropdown(chartId);
            updateChart(chartId); // Cập nhật highlight khi thay đổi step
        });
    }
}

// Hàm xóa tab
function removeTab(event, tabId) {
    event.stopPropagation();
    
    if (!confirm('Bạn có chắc chắn muốn xóa tab này?')) {
        return;
    }
    
    const tabList = document.getElementById('myTab');
    const tabContent = document.getElementById('myTabContent');
    const tabToRemove = document.getElementById(`${tabId}-tab`).parentNode;
    
    // Xác định tab liền kề để chuyển sang sau khi xóa
    let tabToActivate = null;
    const nextTab = tabToRemove.nextElementSibling;
    const prevTab = tabToRemove.previousElementSibling;
    
    // Ưu tiên tab bên phải, nếu không có thì chọn tab bên trái
    if (nextTab && nextTab.id !== 'add-tab') {
        tabToActivate = nextTab.querySelector('.nav-link');
    } else if (prevTab) {
        tabToActivate = prevTab.querySelector('.nav-link');
    }
    
    // Thực hiện xóa
    tabList.removeChild(tabToRemove);
    const contentToRemove = document.getElementById(tabId);
    tabContent.removeChild(contentToRemove);
    
    if (tabId.startsWith('servo')) {
        delete servoCharts[`chartContainer${tabId.replace('servo', '')}`];
    }
    
    // Kích hoạt tab liền kề nếu có
    if (tabToActivate) {
        new bootstrap.Tab(tabToActivate).show();
    } else if (tabList.children.length > 1) { // Nếu không còn tab nào khác ngoài nút '+'
        const firstTab = tabList.children[0].querySelector('.nav-link');
        if (firstTab) new bootstrap.Tab(firstTab).show();
    }
    
    renumberTabs();
}

// Hàm sắp xếp lại số thứ tự các tab
function renumberTabs() {
    const tabList = document.getElementById('myTab');
    let servoIndex = 1;
    let stepperIndex = 1;
    
    Array.from(tabList.children).forEach(tabItem => {
        const tabButton = tabItem.querySelector('.nav-link');
        if (!tabButton || tabButton.id === 'add-tab') return;
        
        const tabId = tabButton.id.replace('-tab', '');
        const isServo = tabId.startsWith('servo');
        
        if (isServo) {
            const newId = `servo${servoIndex}`;
            updateTabIds(tabItem, tabButton, tabId, newId);
            servoIndex++;
        } else {
            const newId = `stepper${stepperIndex}`;
            updateTabIds(tabItem, tabButton, tabId, newId);
            stepperIndex++;
        }
    });
    
    // Cập nhật biến đếm toàn cục
    servoCount = Math.max(1, servoIndex - 1);
    stepperCount = Math.max(1, stepperIndex - 1);
}

function updateSliderFromDropdown(chartId = 'chartContainer') {
    const motorNum = chartId.replace('chartContainer', '') || '1';
    const stepSelect = document.getElementById(`StepSelect${motorNum}`);
    const timeSelect = document.getElementById(`TimeSelect${motorNum}`);
    const slider = document.getElementById(`mainSlider${motorNum}`);
    const sliderValue = document.getElementById(`sliderValue${motorNum}`);
    
    if (!stepSelect || !timeSelect || !slider || !sliderValue) return;
    
    const selectedStep = parseInt(stepSelect.value);
    const selectedTime = parseInt(timeSelect.value);
    
    // Lấy giá trị từ biểu đồ
    const chart = servoCharts[chartId];
    if (chart && chart.options.data[selectedStep] && chart.options.data[selectedStep].dataPoints[selectedTime]) {
        const value = chart.options.data[selectedStep].dataPoints[selectedTime].y;
        slider.value = value;
        sliderValue.textContent = value.toFixed(2);
        
        // Cập nhật điểm đang chọn và highlight
        selectedPoint = { chartId, seriesIndex: selectedStep, pointIndex: selectedTime };
        highlightDataPoint(chartId, selectedStep, selectedTime);
    } else {
        // Nếu không có dữ liệu, bỏ chọn
        selectedPoint = { chartId: null, seriesIndex: null, pointIndex: null };
        clearAllHighlights(chartId);
    }
}

// Hàm cập nhật ID và nội dung tab
function updateTabIds(tabItem, tabButton, oldId, newId) {
    // Cập nhật ID tab button
    tabButton.id = `${newId}-tab`;
    tabButton.setAttribute('data-bs-target', `#${newId}`);
    
    // Cập nhật nội dung tab
    const tabContent = document.getElementById(oldId);
    if (tabContent) {
        tabContent.id = newId;
        tabContent.setAttribute('aria-labelledby', `${newId}-tab`);
    }
    
    // Cập nhật nút đóng
    const closeBtn = tabButton.querySelector('.tab-close-btn');
    if (closeBtn) {
        closeBtn.setAttribute('onclick', `removeTab(event, '${newId}')`);
    }
    
    // Cập nhật tiêu đề nếu là servo
    if (newId.startsWith('servo')) {
        const motorNum = newId.replace('servo', '');
        tabButton.innerHTML = `Servo Motor ${motorNum} <span class="tab-close-btn" onclick="removeTab(event, '${newId}')">×</span>`;
        
        // Cập nhật tiêu đề card nếu tồn tại
        const cardHeader = document.querySelector(`#${newId} .card-header`);
        if (cardHeader) {
            cardHeader.textContent = `Servo Motor ${motorNum} Position Control`;
        }
    } else if (newId.startsWith('stepper')) {
        const motorNum = newId.replace('stepper', '');
        tabButton.innerHTML = `Stepper Motor ${motorNum} <span class="tab-close-btn" onclick="removeTab(event, '${newId}')">×</span>`;
        
        // Cập nhật tiêu đề card nếu tồn tại
        const cardHeaders = document.querySelectorAll(`#${newId} .card-header`);
        if (cardHeaders.length > 0) {
            cardHeaders[0].textContent = `Stepper Motor ${motorNum} Control`;
            if (cardHeaders.length > 1) {
                cardHeaders[1].textContent = `Stepper Motor ${motorNum} Status`;
            }
        }
    }
}

// Cập nhật trạng thái kết nối
function updateConnectionStatus() {
    socket.onopen = function(e) {
        connectionStatus.textContent = 'Đã kết nối';
        connectionStatus.className = 'connection-status connected';
    };
    
    socket.onclose = function(event) {
        connectionStatus.textContent = 'Mất kết nối';
        connectionStatus.className = 'connection-status disconnected';
    };
    
    socket.onerror = function(error) {
        connectionStatus.textContent = 'Lỗi kết nối';
        connectionStatus.className = 'connection-status disconnected';
    };
    
    socket.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            const motorNum = data.id || 1;
            
            if (data.motor === "stepper") {
                // Cập nhật trạng thái stepper motor
                if (document.getElementById(`steps_completed${motorNum}`)) {
                    document.getElementById(`steps_completed${motorNum}`).textContent = data.steps_completed || '-';
                    document.getElementById(`current_angle${motorNum}`).textContent = data.current_angle || '-';
                    // Cập nhật các trường khác tương tự...
                }
                
                // Cập nhật progress bar
                if (data.steps_completed && data.motor_steps && document.getElementById(`progressBar${motorNum}`)) {
                    const progress = (data.steps_completed / data.motor_steps) * 100;
                    document.getElementById(`progressBar${motorNum}`).style.width = progress + '%';
                }
            }
            // Xử lý servo motor giữ nguyên...
            
        } catch (error) {
            console.error('Lỗi phân tích dữ liệu WebSocket:', error);
        }
    };
}

// Hàm cập nhật bảng trạng thái
// Hàm cập nhật bảng trạng thái
function updateStatusPanel(chartId = 'chartContainer') {
    const motorNum = chartId.replace('chartContainer', '') || '1';
    
    // Lấy các phần tử DOM
    const stepSelect = document.getElementById(`StepSelect${motorNum}`);
    const timeSelect = document.getElementById(`TimeSelect${motorNum}`);
    const sliderValue = document.getElementById(`sliderValue${motorNum}`);
    
    // Kiểm tra nếu các phần tử status panel tồn tại trước khi cập nhật
    const currentStepElement = document.getElementById(`currentStep${motorNum}`);
    const currentTimeElement = document.getElementById(`currentTime${motorNum}`);
    const currentPositionElement = document.getElementById(`currentPosition${motorNum}`);
    const minPositionElement = document.getElementById(`minPosition${motorNum}`);
    const maxPositionElement = document.getElementById(`maxPosition${motorNum}`);
    
    if (!stepSelect || !timeSelect || !sliderValue || 
        !currentStepElement || !currentTimeElement || 
        !currentPositionElement || !minPositionElement || 
        !maxPositionElement) {
        return;
    }
    
    // Cập nhật giá trị
    const currentStep = parseInt(stepSelect.value) + 1;
    const currentTime = parseInt(timeSelect.value) + 1;
    const currentPos = sliderValue.textContent;
    
    // Cập nhật bảng status
    currentStepElement.textContent = `Step ${currentStep}`;
    currentTimeElement.textContent = `Time ${currentTime}`;
    currentPositionElement.textContent = `${currentPos}°`;
    
    const minDegreeInput = document.getElementById(`minDegreeInput${motorNum}`);
    const maxDegreeInput = document.getElementById(`maxDegreeInput${motorNum}`);
    
    if (minDegreeInput && maxDegreeInput) {
        minPositionElement.textContent = minDegreeInput.value + "°";
        maxPositionElement.textContent = maxDegreeInput.value + "°";
    }
    
    // Thêm tooltip khi di chuột qua điểm dữ liệu
    const chart = servoCharts[chartId];
    if (chart) {
        chart.options.toolTip = {
            content: function(e) {
                if (e.entries && e.entries.length) {
                    const dataPoint = e.entries[0].dataPoint;
                    return `<strong>${e.entries[0].dataSeries.name}</strong><br/>
                            Thời điểm: ${dataPoint.label}<br/>
                            Vị trí: ${dataPoint.y.toFixed(2)}°`;
                }
                return "";
            }
        };
    }
}

// Tải dữ liệu từ server
function LoadData(motorNum = 1) {
    if (socket.readyState === WebSocket.OPEN) {
        const Set_PRM = document.getElementById(`Set_PRM${motorNum}`);
        const from = document.getElementById(`from${motorNum}`);
        const to = document.getElementById(`to${motorNum}`);
        const type = document.getElementById(`type${motorNum}`);
        
        if (Set_PRM && from && to && type) {
            socket.send(JSON.stringify({
                CMD: "get",
                motor: "stepper",
                id: motorNum,
                Set_PRM: Set_PRM.value,
                from: from.value,
                to: to.value,
                type: type.value
            }));
        }
    }
}

// Hàm HOME gửi lệnh về home position
function HOME(motorId) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            CMD: "home",
            motor: motorId > 0 ? "stepper" : "servo", // Phân biệt servo/stepper
            id: motorId,
            value: 1
        }));
    }
}

// Khởi tạo ứng dụng khi tải trang
window.onload = function() {
    initializeServoChart(); // Khởi tạo biểu đồ mặc định
    setupEventListeners();
    updateConnectionStatus();
    setInterval(LoadData, 5000);
    // Thêm sau setupEventListeners();
    setupStepperEventListeners(1); // Cho stepper motor 1 mặc định
};