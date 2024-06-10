import styles from "./LoginPage.module.scss"
import logoImage from "../../assets/logo.png"
import { Button, FormControl, FormLabel, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import api from "../../utils/api";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../store/slices/Toast";
import { login, signUp } from "../../services/authService";
import { useNavigate } from "react-router-dom";

function LoginPage() {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch()

    const navigate = useNavigate()

    const handleLogin = async (data) => {
        data = {
            ...data,
            userName: data.userName.trim(),
        }
        try {
            const res = await login(data);
            const { message, data: resData, status } = res.data
            console.log(resData);
            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            reset({
                password: ""
            })
            if (status === 200) {
                reset()
                localStorage.setItem('token', resData.token)
                localStorage.setItem('user', JSON.stringify(resData.user))
                navigate("/")
            }
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: error.message
            }));
        }
    }
    return (
        <div className={styles.loginPage} onKeyDown={e => {
            if (e.key === "Enter") {
                handleSubmit(handleLogin)()
            }
        }}>
            <div className={styles.loginPageBody}>
                <div className={styles.headingLogo} >
                    <img src={logoImage} style={{ width: "28px" }} />
                    <span className={styles.text}>Trading Bot</span>
                </div>
                <form className={styles.form}>
                    <div className={styles.formTitle}>
                        <p className={styles.textMain}>Login to Your Account</p>
                        <p style={{ opacity: .9 }}>Enter your username & password to login</p>
                    </div>

                    <div className={styles.formData}>
                        <FormControl className={styles.formControl}>
                            <FormLabel className={styles.label}>Username</FormLabel>
                            <TextField
                                error={errors.userName?.type === 'required'}
                                size="small"
                                {...register("userName", { required: true, minLength: 5 })}
                            />
                            {errors.userName?.type === 'required' && <p className="formControlErrorLabel">The Username field is required.</p>}
                            {errors.userName?.type === 'minLength' && <p className="formControlErrorLabel">Minimum length is 5 characters.</p>}

                        </FormControl>

                        <FormControl className={styles.formControl}>
                            <FormLabel className={styles.label}>Password</FormLabel>
                            <TextField
                                error={errors.password?.type === 'required'}
                                type="password"
                                size="small"
                                {...register("password", { required: true, minLength: 5 })}
                            />
                            {errors.password?.type === 'required' && <p className="formControlErrorLabel">The Password field is required.</p>}
                            {errors.password?.type === 'minLength' && <p className="formControlErrorLabel">Minimum length is 5 characters.</p>}

                        </FormControl>
                        <Button
                            onClick={handleSubmit(handleLogin)}
                            variant="contained"
                            style={{ marginTop: "16px" }}>
                            Login
                        </Button>
                    </div>

                </form>

                <p>© Copyright <b>FOMO LAND</b>.</p>
            </div>
        </div>
    );
}

export default LoginPage;